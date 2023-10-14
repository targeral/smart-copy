export const generateSHA256 = async (text: string) => {
  // 将文本内容编码为 UTF-8 字节数组
  const encoder = new TextEncoder();
  const data = encoder.encode(text);

  // 计算文本内容的 SHA-256 哈希
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);

  // 将哈希值转换为十六进制字符串
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');

  return hashHex;
};
