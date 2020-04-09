// Grab environment variables from Azure DevOps and create the versioning-info.json file
// src/app/version-info.ts reads this so the version detail is available to the application

const { writeFileSync } = require('fs');

const versionInfo = {
    "sourceVersion": process.env["BUILD_SOURCEVERSION"] || "local-dev-source-version",
    "buildDate": process.env["BUILD_DATE"] || "local-dev-build-date",
    "buildNumber": process.env["BUILD_BUILDNUMBER"] || "local-dev-build-number",
};

const versionInfoJson = JSON.stringify(versionInfo, null, 2);
console.log("versioning-info.json", versionInfoJson);

writeFileSync('versioning-info.json', versionInfoJson);