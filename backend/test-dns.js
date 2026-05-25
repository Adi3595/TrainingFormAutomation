const dns = require("dns");

dns.setDefaultResultOrder("ipv4first");

dns.lookup("smtp.gmail.com", { family: 4 }, (err, address) => {
  if (err) {
    console.error("❌ DNS failed:", err);
  } else {
    console.log("✅ IPv4 resolved:", address);
  }
});