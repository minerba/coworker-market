// app.json을 기본으로 쓰고, google-services.json(Firebase)이 있으면 안드로이드 푸시용으로 포함한다.
const fs = require("fs");
const base = require("./app.json");

module.exports = () => {
  const expo = { ...base.expo, android: { ...base.expo.android } };
  if (fs.existsSync("./google-services.json")) expo.android.googleServicesFile = "./google-services.json";
  return { expo };
};
