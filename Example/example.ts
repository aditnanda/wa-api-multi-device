import { Boom } from '@hapi/boom'
import P from 'pino'
import { send } from 'process';
import makeWASocket, { AnyMessageContent, delay, DisconnectReason, fetchLatestBaileysVersion, makeInMemoryStore, useSingleFileAuthState } from '../src'
const express = require('express');
const http = require("http");
const qrcode = require("qrcode");
const fs = require("fs");
const app = express();
const server = http.createServer(app);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/view'));


const configs = {
    port: 3102, // custom port to access server
    url_callback : 'http://wagw.aditnanda.com/helper/callback.php'
};
// the store maintains the data of the WA connection in memory
// can be written out to a file & read from it
const store = makeInMemoryStore({ logger: P().child({ level: 'debug', stream: 'store' }) })
store.readFromFile('./baileys_store_multi.json')
// save every 10s
setInterval(() => {
	store.writeToFile('./baileys_store_multi.json')
}, 10_000)

const { state, saveState } = useSingleFileAuthState('./auth_info_multi.json')

// start a connection
const startSock = async() => {
	// fetch latest version of WA Web
	const { version, isLatest } = await fetchLatestBaileysVersion()
	console.log(`using WA v${version.join('.')}, isLatest: ${isLatest}`)

	const sock = makeWASocket({
		version,
		logger: P({ level: 'debug' }),
		printQRInTerminal: true,
		auth: state,
		// implement to handle retries
		getMessage: async key => {
			return {
				conversation: 'hello'
			}
		}
	})

	store.bind(sock.ev)

	const sendMessageWTyping = async(msg: AnyMessageContent, jid: string) => {
		await sock.presenceSubscribe(jid)
		await delay(500)

		await sock.sendPresenceUpdate('composing', jid)
		await delay(2000)

		await sock.sendPresenceUpdate('paused', jid)

		await sock.sendMessage(jid, msg)
	}
    
	sock.ev.on('chats.set', item => console.log(`recv ${item.chats.length} chats (is latest: ${item.isLatest})`))
	sock.ev.on('messages.set', item => console.log(`recv ${item.messages.length} messages (is latest: ${item.isLatest})`))
	sock.ev.on('contacts.set', item => console.log(`recv ${item.contacts.length} contacts`))

	sock.ev.on('messages.upsert', async m => {
		// console.log(JSON.stringify(m, undefined, 2))
        
		const msg = m.messages[0]
		if(!msg.key.fromMe && m.type === 'notify') {
			console.log('replying to', m.messages[0].key.remoteJid)
			await sock!.sendReadReceipt(msg.key.remoteJid, msg.key.participant, [msg.key.id])
			await sendMessageWTyping({ text: 'Terima kasih telah menghubungi WA Bot, untuk informasi seputar penawaran pembuatan aplikasi Website dan Android bisa menghubungi melalui email pada aditnanda@nand.cloud!' }, msg.key.remoteJid)
		}
        
	})

	sock.ev.on('messages.update', m => console.log(m))
	sock.ev.on('message-receipt.update', m => console.log(m))
	sock.ev.on('presence.update', m => console.log(m))
	sock.ev.on('chats.update', m => console.log(m))
	sock.ev.on('contacts.upsert', m => console.log(m))

	sock.ev.on('connection.update', (update) => {
		const { connection, lastDisconnect } = update
		if(connection === 'close') {
			// reconnect if not logged out
			if((lastDisconnect.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut) {
				startSock()
			} else {
				console.log('connection closed')
			}
		}
		if (update.qr) { // if the 'qr' property is available on 'conn'
			console.log('QR Generated',update.qr);
			generate(update.qr)
			// qr.toFile(resolvePath(__dirname, '..', 'qr.png'), update.qr); // generate the file
		} else if (update.connection && update.connection === 'close') { // when websocket is closed
			// if (existsSync(resolvePath(__dirname, '..', 'qr.png'))) { // and, the QR file is exists
			// 	unlinkSync(resolvePath(__dirname, '..', 'qr.png')); // delete it
			// }
			if (fs.existsSync('Example/view/qrcode.png')) {
				fs.unlinkSync('Example/view/qrcode.png')
			}
		}else{
			if (fs.existsSync('Example/view/qrcode.png')) {
				fs.unlinkSync('Example/view/qrcode.png')
			}
		}
        
		console.log('connection update', update)
	})
	// listen for when the auth credentials is updated
	sock.ev.on('creds.update', saveState)

	app.post('/send-message', async (req, res) => {
		const number = req.body.number;
		const message = req.body.message;
	
		if (number == null || message == null) {
			res.end(JSON.stringify({
				status: false,
				message: 'number / message is null'
			}));
		}else{
			const sentMsg  = await sock.sendMessage(phoneNumberFormatter(number), { text: message })

			if (sentMsg.status) {
				res.end(JSON.stringify({
					status: true,
					message: sentMsg
				}));
			}else{
				res.end(JSON.stringify({
					status: 1,
					message: 'Failed, Please Try Again'
				}));
			}
			
	
		}
	}); 

	app.post('/send-message-broadcast', async (req, res) => {
		const numberArray = req.body.number.split(',');
		const message = req.body.message;
	
		if (numberArray.length == 0 || message == null) {
			res.end(JSON.stringify({
				status: false,
				message: 'number / message is null or split number with comma'
			}));
		}else{
			var statusB = []
			for (let index = 0; index < numberArray.length; index++) {

				const sentMsg  = await sock.sendMessage(phoneNumberFormatter(numberArray[index]), { text: message })

				statusB.push(sentMsg)
				sleep(getRandomInt(1000,5000))
			}

			res.end(JSON.stringify({
				status: true,
				message: statusB
			}));
			
	
		}
	}); 

	app.get('/',function(req,res) {
		res.sendFile('view/index.html', { root: __dirname })
	});

	return sock
}

startSock()

const sleep = (milliseconds) => {
    const date = Date.now();
    let currentDate = null;
    do {
      currentDate = Date.now();
    } while (currentDate - date < milliseconds);
};

function getRandomInt(min, max) {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min) + min); //The maximum is exclusive and the minimum is inclusive
}

const phoneNumberFormatter = function (number) {
    // 1. Menghilangkan karakter selain angka
    let formatted = number.replace(/\D/g, '');

    // 2. Menghilangkan angka 0 di depan (prefix)
    //    Kemudian diganti dengan 62
    if (formatted.startsWith('0')) {
        formatted = '62' + formatted.substr(1);
    }

    if (formatted.startsWith('+62')) {
        formatted = '62' + formatted.substr(3);
    }

    if (!formatted.endsWith('@s.whatsapp.net')) {
        formatted += '@s.whatsapp.net';
    }

    return formatted;
}

const generate = async function (input) {
	var rawData = await qrcode.toDataURL(input, { scale: 8 })
	var dataBase64 = rawData.replace(/^data:image\/png;base64,/, "")
	fs.writeFileSync('Example/view/qrcode.png', dataBase64, 'base64')
	console.log("Success generate image qr")
}

server.listen(configs.port, function () {
    console.log('App running on *: ' + configs.port);
});
