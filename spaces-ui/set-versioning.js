// Create the versioning-info.json file from arguments
// src/app/version-info.ts reads this so the version detail is available to the application

const { writeFileSync } = require('fs');

// node set-versioning.js [sourceVersion] [buildDate] [buildNumber]

if (process.argv.length != 5) {
    console.error("Not enough arguments. Usage: node set-versioning.js [sourceVersion] [buildDate] [buildNumber]")
}
else {
    const versionInfo = {
        "sourceVersion": process.argv[2],
        "buildDate": process.argv[3],
        "buildNumber": process.argv[4],
    };

    const versionInfoJson = JSON.stringify(versionInfo, null, 2);
    console.log("versioning-info.json", versionInfoJson);

    writeFileSync('versioning-info.json', versionInfoJson);
}