async function contentDetector(message) {
  console.log("[INFO] contentDetector");
  if (message.partial) {
    try {
      await message.fetch();
    } catch (error) {
      console.error(error);
      return false;
    }
  }
  if (message.embeds.length > 0) {
    const content = message.content;
    if (null != content && !content.includes("tenor.com")) {
      return true;
    }
  }
  if (message.attachments.size > 0) {
    const contentType = message.attachments.first().contentType;
    if (null != contentType && (contentType.includes("image") || contentType.includes("video"))) {
      return true;
    }
  }
  return false;
}

module.exports = { contentDetector };
