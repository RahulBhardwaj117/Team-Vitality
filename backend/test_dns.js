const dns = require('dns');

const shards = [
    'agriurbanai-shard-00-00.s8ohe5i.mongodb.net',
    'agriurbanai-shard-00-01.s8ohe5i.mongodb.net',
    'agriurbanai-shard-00-02.s8ohe5i.mongodb.net'
];

console.log('Testing A-record resolution...');

shards.forEach(shard => {
    dns.lookup(shard, (err, address) => {
        if (err) {
            console.log(`❌ Failed to resolve ${shard}: ${err.message}`);
        } else {
            console.log(`✅ Resolved ${shard} to ${address}`);
        }
    });
});
