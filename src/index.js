const functions = require("@google-cloud/functions-framework");

const ALLOWED_TELEGRAM_IDS = [446618160, 510785355, 502448796, 984567315]; // [m, l, m, d]
const ALLOWED_TELEGRAM_USERNAMES = [];
const TELEGRAM_API_URL = "https://api.telegram.org/bot";
const CHAT_GPT_URL = "https://api.openai.com/v1/chat/completions";
// const HUGGING_FACE_URL = "https://api-inference.huggingface.co/models/gpt2";

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
  console.log(`request: ${req.body.message.text}`);

  if (!req.body.message.text) {
    console.error(req.body.message);
    res.status(200).send({ success: true });
    return;
  }

  //

  const response = await fetch(CHAT_GPT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.CHATGPT_TOKEN}`,
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: req.body.message.text }],
    }),
  });

  const data = await response.json();
  const answer = data.error?.message
    ? data.error.message
    : data.choices[0].message.content.trim();

  //

  // const response = await fetch(HUGGING_FACE_URL, {
  //   method: "POST",
  //   headers: {
  //     "Content-Type": "application/json",
  //     Authorization: `Bearer ${process.env.HUGGING_FACE_TOKEN}`,
  //   },
  //   body: JSON.stringify({
  //     inputs: req.body.message.text,
  //   }),
  // });

  // const data = await response.json();
  // console.log(data[0].generated_text);
  // const answer = data[0].generated_text;

  //

  console.log(`response: ${answer}`);

  await fetch(
    `${TELEGRAM_API_URL}${process.env["TELEGRAM_TOKEN"]}/sendMessage`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: answer,
        chat_id: req.body.message.from.id,
      }),
    }
  );

  console.log("Done!");

  res.status(200).send({ success: true });
});
