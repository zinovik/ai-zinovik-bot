const CHAT_GPT_URL = "https://api.openai.com/v1/chat/completions";

export const getAiReply = async (messages) => {
  const response = await fetch(CHAT_GPT_URL, {
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

  const data = await response.json();

  return data.error?.message
    ? data.error.message
    : data.choices[0].message.content.trim();
};
