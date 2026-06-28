const imageStr = "Https://i.postimg.cc/FsYyr9HL/gsmarena-003-2.jpg\nHttps://i.postimg.cc/gkxVzY2n/gsmarena-007-2.jpg";
const imageUrls = imageStr
  .split(/[\r\n,\s]+/)
  .map(s => {
    let cleaned = s.trim().replace(/^["'`\s\[\(]+|["'`\s\]\)]+$/g, '');
    if (/^https?:\/\//i.test(cleaned)) {
      cleaned = cleaned.replace(/^https?:\/\//i, (match) => match.toLowerCase());
    }
    return cleaned;
  })
  .filter(Boolean);
console.log(imageUrls);
