const functions = require("@google-cloud/functions-framework");
const { Storage } = require("@google-cloud/storage");

const ALLOWED_TELEGRAM_IDS = [446618160, 510785355, 502448796, 984567315]; // [m, l, m, d]
const ALLOWED_TELEGRAM_USERNAMES = [];

const TELEGRAM_API_URL = "https://api.telegram.org/bot";
const CHAT_GPT_URL = "https://api.openai.com/v1/chat/completions";

const BUCKET_NAME = "ai-zinovik-bot";

const MESSAGES_HISTORY_SIZE = 100;

const updateMessages = async (id, newMessage) => {
  const storage = new Storage();
  const bucketFile = storage.bucket(BUCKET_NAME).file(`${id}.json`);

  let messages;

  try {
    const file = await bucketFile.download();
    messages = JSON.parse(file.toString());
  } catch (error) {
    console.log("New history");
    messages = [];
  }

  const updatedMessages = newMessage
    ? [...messages, newMessage].slice(0 - MESSAGES_HISTORY_SIZE)
    : [];

  await bucketFile.save(Buffer.from(JSON.stringify(updatedMessages)), {
    gzip: true,
    public: false,
    resumable: true,
    contentType: "application/json",
    metadata: {
      cacheControl: "no-cache",
    },
  });

  return updatedMessages;
};

functions.http("main", async (req, res) => {
  console.log("Triggered!");

  if (
    req.query.token !== process.env["APP_TOKEN"] ||
    (!ALLOWED_TELEGRAM_IDS.includes(req.body.message.from.id) &&
      !ALLOWED_TELEGRAM_USERNAMES.includes(req.body.message.from.username))
  ) {
    console.error("Auth failed!");
    console.error(req.query.token);
    res.status(200).send();
    return;
  }

  console.log(
    `user: ${req.body.message.from.id}, ${req.body.message.from.username}`
  );
  console.log(`user message: ${req.body.message.text}`);

  if (!req.body.message.text) {
    console.error(req.body.message);
    res.status(200).send({ success: true });
    return;
  }

  if (req.body.message.text.toLowerCase() === "clear") {
    await updateMessages(req.body.message.from.id, null);

    const clearedMessage = await fetch(
      `${TELEGRAM_API_URL}${process.env["TELEGRAM_TOKEN"]}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: "The history has been cleared",
          chat_id: req.body.message.from.id,
        }),
      }
    );

    await new Promise((resolve) => setTimeout(resolve, 5000));

    await fetch(
      `${TELEGRAM_API_URL}${process.env["TELEGRAM_TOKEN"]}/deleteMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: req.body.message.from.id,
          message_id: (await clearedMessage.json()).result.message_id,
        }),
      }
    );

    res.status(200).send({ success: true });
    return;
  }

  const messages = await updateMessages(req.body.message.from.id, {
    role: "user",
    content: req.body.message.text,
  });

  const sendProgressMsg = await fetch(
    `${TELEGRAM_API_URL}${process.env["TELEGRAM_TOKEN"]}/sendMessage`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: "Thinking... Please wait",
        chat_id: req.body.message.from.id,
      }),
    }
  );

  const progressMsgData = await sendProgressMsg.json();
  const messageId = progressMsgData.result.message_id;

  let response;

  try {
    response = await fetch(CHAT_GPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.CHATGPT_TOKEN}`,
      },
      body: JSON.stringify({
        model: "gpt-5", // TODO: Move to file or config
        messages,
      }),
    });
  } catch (error) {
    await fetch(
      `${TELEGRAM_API_URL}${process.env["TELEGRAM_TOKEN"]}/editMessageText`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: `Error: ${error.message}`,
          chat_id: req.body.message.from.id,
          message_id: messageId,
        }),
      }
    );
  }

  const data = await response.json();
  const botReply = data.error?.message
    ? data.error.message
    : data.choices[0].message.content.trim();

  console.log(`bot reply: ${botReply}`);

  await fetch(
    `${TELEGRAM_API_URL}${process.env["TELEGRAM_TOKEN"]}/editMessageText`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: botReply,
        chat_id: req.body.message.from.id,
        message_id: messageId,
      }),
    }
  );

  await updateMessages(req.body.message.from.id, {
    role: "assistant",
    content: botReply,
  });

  console.log("Done!");

  res.status(200).send({ success: true });
});
