import * as express from 'express';
import * as bodyParser from 'body-parser';
import { HttpProvider } from '@0xcert/ethereum-http-provider';
import { AssetLedger } from '@0xcert/ethereum-asset-ledger';

const app = express();
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());
const port = 3000;

const provider = new HttpProvider({
  url: 'http://127.0.0.1:8545',
  accountId: '0x43813a78436c9ce02c97dd93ccd0ba33618f379b',
  requiredConfirmations: 1
});

app.get('/', (req, res) => {
    res.send('Hello World!')
});

app.post('/deploy', async (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  const mutation = await AssetLedger.deploy(provider, {
    name: req.body.name,
    symbol: req.body.symbol,
    uriBase: req.body.uriBase,
    schemaId: req.body.schemaId,
    capabilities: req.body.capabilities
  });
  res.send(mutation.id);
});

app.post('/create', async (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

  const ledger = AssetLedger.getInstance(provider, req.body.assetLedgerId);
  const mutation = await ledger.createAsset({
      receiverId: req.body.receiverId,
      id: req.body.id,
      imprint: req.body.imprint
  });
  res.send(mutation.id);
});

app.post('/transfer', async (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  
  const ledger = AssetLedger.getInstance(provider, req.body.assetLedgerId);
  const mutation = await ledger.transferAsset({
      receiverId: req.body.receiverId,
      id: req.body.id,
  });
  res.send(mutation.id);
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}!`);
});