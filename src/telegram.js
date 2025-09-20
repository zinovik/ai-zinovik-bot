const TELEGRAM_API_URL = "https://api.telegram.org/bot";

const requestTelegram = async (endpoint, chatId, text, messageId) =>
  fetch(`${TELEGRAM_API_URL}${process.env["TELEGRAM_TOKEN"]}/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: chatId,
      ...(text ? { text } : {}),
      ...(messageId ? { message_id: messageId } : {}),
    }),
  });

export const sendMessage = async (chatId, text, messageId) => {
  const response = await requestTelegram(
    "sendMessage",
    chatId,
    text,
    messageId
  );

  const responseJson = await response.json();

  return responseJson.result.message_id;
};

export const editMessageText = async (chatId, text, messageId) =>
  requestTelegram("editMessageText", chatId, text, messageId);
