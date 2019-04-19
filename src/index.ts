// Import everything.
import * as express from 'express';
import * as bodyParser from 'body-parser';
import { HttpProvider } from '@0xcert/ethereum-http-provider';
import { AssetLedger, GeneralAssetLedgerAbility } from '@0xcert/ethereum-asset-ledger';
import { OrderGateway, Order, OrderActionKind } from '@0xcert/ethereum-order-gateway';

// Setup Express and body parser.
const app = express();
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());
const port = 3000;

// Instance of provider (this uses my Ethereum address as accountId, please replace it with your own).
const provider = new HttpProvider({
  url: 'http://127.0.0.1:8545',
  accountId: '0x43813a78436c9ce02c97dd93ccd0ba33618f379b',
  requiredConfirmations: 1
});

// Default route.
app.get('/', (req, res) => {
    res.send('Hello World!')
});

// Deploy a new asset ledger.
app.post('/deploy', async (req, res) => {
  // I'm adding CORS headers to allow this API to be used in index.html opened from file system.
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

  const mutation = await AssetLedger.deploy(provider, {
    name: req.body.name,
    symbol: req.body.symbol,
    uriBase: req.body.uriBase,
    schemaId: req.body.schemaId,
    capabilities: req.body.capabilities
  }); // You can catch errors by adding .catch((e) => console.log(e)).
  res.send(mutation.id);
});

// Create a new asset.
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

// Transfer an asset.
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

// Create an atomic order
// Replace account1, account2 and assetLedgerId with your addresses.
app.post('/atomic-order', async (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  
  const orderGatewayId = '0x28dDb78095cf42081B9393F263E8b70BffCbF88F';
  const orderGateway = OrderGateway.getInstance(provider, orderGatewayId);

  const account1 = '0x43813a78436c9ce02c97dd93ccd0ba33618f379b';
  const account2 = '0x833527053a42fd88079d80e946041bae40edd65d'; // 0x... - Account we just created.
  const assetLedgerId = '0x205a3cd89c2de7680931368cd9ede5db8ec5bb0f'; // Your already deployed asset ledger.
  const ledger = AssetLedger.getInstance(provider, assetLedgerId);

  // Define order
  const order = {
    makerId: account1, 
    takerId: account2, 
    actions: [
      {
        kind: OrderActionKind.TRANSFER_ASSET,
        ledgerId: assetLedgerId,
        senderId: account1,
        receiverId: account2,
        assetId: '100',
      },
      {
        kind: OrderActionKind.CREATE_ASSET,
        ledgerId: assetLedgerId,
        receiverId: account1,
        assetId: '200',
        assetImprint: '0000000000000000000000000000000000000000000000000000000000000000', // check certification section in documentation on how to create a valid imprint
      },
    ],
    seed: Date.now(), // unique order identification
    expiration: Date.now() + 60 * 60 * 24, // 1 day
  } as Order;

  const signedClaim = await orderGateway.claim(order);
    // approve account for transfering asset
  await ledger.approveAccount('100', orderGateway).then((mutation) => {
    return mutation.complete();
  });

  // assign ability to mint
  await ledger.grantAbilities(orderGateway, [GeneralAssetLedgerAbility.CREATE_ASSET]).then((mutation) => {
    return mutation.complete();
  });

  const providerTaker = new HttpProvider({
    url: 'http://127.0.0.1:8545',
    accountId: account2,
    requiredConfirmations: 1
  });

  const orderGatewayTaker = OrderGateway.getInstance(providerTaker, orderGatewayId); 
  const mutation = await orderGatewayTaker.perform(order, signedClaim);
  res.send(mutation.id);
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}!`);
});