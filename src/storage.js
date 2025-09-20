const BUCKET_NAME = "ai-zinovik-bot";
const MESSAGES_HISTORY_SIZE = 100;

export const updateMessages = async (storage, id, newMessage) => {
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
