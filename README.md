# Baileys - Typescript/Javascript WhatsApp Web API
 
 Baileys does not require Selenium or any other browser to be interface with WhatsApp Web, it does so directly using a **WebSocket**. Not running Selenium or Chromimum saves you like **half a gig** of ram :/ 

 Baileys supports interacting with the multi-device & web versions of WhatsApp.

 Thank you to [@pokearaujo](https://github.com/pokearaujo/multidevice) for writing his observations on the workings of WhatsApp Multi-Device. Also, thank you to [@Sigalor](https://github.com/sigalor/whatsapp-web-reveng) for writing his observations on the workings of WhatsApp Web and thanks to [@Rhymen](https://github.com/Rhymen/go-whatsapp/) for the __go__ implementation.

 Baileys is type-safe, extensible and simple to use. If you require more functionality than provided, it'll super easy for you to write an extension. More on this [here](#WritingCustomFunctionality).
 
 If you're interested in building a WhatsApp bot, you may wanna check out [WhatsAppInfoBot](https://github.com/adiwajshing/WhatsappInfoBot) and an actual bot built with it, [Messcat](https://github.com/ashokatechmin/Messcat).
 
 **Read the docs [here](https://adiwajshing.github.io/Baileys)**
 **Join the Discord [here](https://discord.gg/WeJM5FP9GG)**

## Example

Do check out & run [example.ts](Example/example.ts) to see example usage of the library.
The script covers most common use cases.
To run the example script, download or clone the repo and then type the following in terminal:
1. ``` cd path/to/Baileys ```
2. ``` yarn ```
3. 
    - ``` yarn example ``` for the multi-device edition
    - ``` yarn example:legacy ``` for the legacy web edition
