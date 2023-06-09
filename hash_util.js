const crypto = require('crypto');


/**
 * @param {String} string 
 * @return {String} String
 */
function hashString(string){
    const hash = crypto.createHash("sha256").update(string).digest("hex");
    const hashStr = new String(hash);
    return hashStr.toString();
}

module.exports = {hashString};