const functions = require("@google-cloud/functions-framework");
const { Storage } = require("@google-cloud/storage");
const { sendMessage, editMessageText } = require("./telegram");
const { getAiReply } = require("./chatgpt");
const { updateMessages } = require("./storage");

const ALLOWED_TELEGRAM_IDS = [446618160, 510785355, 502448796, 984567315]; // [m, l, m, d]
const ALLOWED_TELEGRAM_USERNAMES = [];

functions.http("main", async (req, res) => {
  console.log("Triggered!");

  const charId = req.body.message.from.id;
  const username = req.body.message.from.username;

  if (
    req.query.token !== process.env["APP_TOKEN"] ||
    (!ALLOWED_TELEGRAM_IDS.includes(charId) &&
      !ALLOWED_TELEGRAM_USERNAMES.includes(username))
  ) {
    console.error("Auth failed!");
    console.error(req.query.token);
    res.status(200).send();
    return;
  }

  console.log(`user: ${charId}, ${username}`);
  console.log(`user message: ${req.body.message.text}`);

  if (!req.body.message.text) {
    console.error(req.body.message);
    res.status(200).send({ success: true });
    return;
  }

  const storage = new Storage();

  if (req.body.message.text.toLowerCase() === "clear") {
    await updateMessages(storage, charId, null);
    await sendMessage(charId, "The history has been cleared");
    res.status(200).send({ success: true });
    return;
  }

  const messages = await updateMessages(storage, charId, {
    role: "user",
    content: req.body.message.text,
  });

  const replyMessageId = await sendMessage(charId, "Thinking... Please wait");

  let botReply;
  try {
    botReply = await getAiReply(messages);
  } catch (error) {
    await editMessageText(charId, `Error: ${error.message}`, replyMessageId);
    res.status(200).send({ success: true });
    return;
  }

  console.log(`bot reply: ${botReply}`);

  await editMessageText(charId, botReply, replyMessageId);

  await updateMessages(storage, charId, {
    role: "assistant",
    content: botReply,
  });

  console.log("Done!");

  res.status(200).send({ success: true });
});
