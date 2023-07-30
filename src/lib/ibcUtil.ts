// import { API, Action, Asset, PermissionLevel, UInt32Type } from "@greymass/eosio"
// import { getConfig } from "lib/env"
// import { ChainClient, ChainClients, getChainClient } from "lib/eosio"
// import { FirehoseClient, GetBlockQuery } from "lib/firehose"
// import { getHypClient, hypClients } from "lib/hyp"
// import { IBCTokens, ibcTokens } from "lib/ibcTokens"
// import logger from "lib/logger"
// import { ActionTrace } from "lib/types/firehoseTypes"
// import { Checkproofd, Lastproof } from "lib/types/ibc.prove.types"
// import { ActionReceipt, ChainKey, IbcToken, ProofData, ProofDataResult } from "lib/types/ibc.types"
// import { Emitxfer, Withdrawa } from "lib/types/wraplock.types"
// import { Issuea } from "lib/types/wraptoken.types"
// import { throwErr } from "lib/utils"
// import WebSocket from "ws"
// const log = logger.getLogger("ibcUtil")




// export class IBCUtil {
//   ibcTokens:IBCTokens
//   chainClients:ChainClients

//   constructor(chainClients:ChainClients, ibcTokens:IBCTokens) {
//     this.ibcTokens = ibcTokens
//     this.chainClients = chainClients
//   }

//   getIbcToken(symbol:Asset.Symbol):IbcToken {
//     const tkn = Object.entries(this.ibcTokens).find(tkn => tkn[0] === symbol.name)
//     if (!tkn) throw new Error(`No token found for symbol ${symbol.name} `)
//     return tkn[1]
//   }

//   async makeProofAction(chainKey:ChainKey, blockNum:number, txid:string):Action {
//     const hyp = getHypClient(chainKey)
//     const trx = await hyp.getTrx(txid)
//     if (!trx) throwErr("can't find trx", txid, "on chainKey:", chainKey)
//     let xfer = trx.actions.find(action => action.act.name === "emitxfer")
//     if (!xfer) throwErr("This trx does not have an emitxfer action:", txid, "on chainKey:", chainKey)
//     // const fh = new FirehoseClient(chainKey)
//     // const hyp = hypClients[chainKey]
//     // hyp?.getTrx
//     // const block = await fh.getFirehoseBlock(getFirehoseBlock(blockNum))
//     // const trx = block.block.unfilteredTransactionTraces.find(el => el.id == txid)
//     // if (!trx) throwErr("can't find trx", txid, "in firehose block:", blockNum, "on chain:", chainKey)

//     // const recepits = trx.actionTraces.map(el => el.receipt)
//     // const emitXferAction = {
//     //   act: recepits[0],
//     //   receipt: {
//     //     ...recepits,
//     //     code_sequence: trx.actionTraces[0]

//     //   }
//     // }
//     //   let emitxferAction = {
//     //     act: prevTransfer.action.act,
//     //     receipt:{
//     //       ...prevTransfer.action.receipts[0],
//     //       code_sequence: prevTransfer.action.code_sequence,
//     //       abi_sequence: prevTransfer.action.abi_sequence,
//     //     }
//     //   };
//     //   let auth_sequence = [];
//     //   for (var auth of prevTransfer.action.receipts[0].auth_sequence) auth_sequence.push([auth.account, auth.sequence]);
//     //   emitxferAction.receipt.auth_sequence = auth_sequence;

//     //   let light = lastBlockProvedRes && lastBlockProvedRes.block_height > block_to_prove;

//     //   let query = {
//     //     type: light? "lightProof": "heavyProof",
//     //     action: emitxferAction,
//     //     block_to_prove: block_to_prove //block that includes the emitxfer action we want to prove
//     //   }

//     //   if(light) query.last_proven_block = lastBlockProvedRes.block_height;

//     //   let emitxferProof = await getProof(query);
//     //   console.log("emitxferProof",emitxferProof);

//     //   if(light) emitxferProof.data.blockproof.root = lastBlockProvedRes.block_merkle_root;

//     //   destinationActions = [emitxferProof];
//     //   submitProof();
//     // }
//   }
// }

// export function getFirehoseBlock(blockNum:number):GetBlockQuery {
//   return {
//     firehoseOptions: {
//       start_block_num: blockNum,
//       stop_block_num: blockNum,
//       fork_steps: ["STEP_IRREVERSIBLE"],
//       include_filter_expr: ""
//     }
//   }
// }


// export const getProof = async(blockNum:number, fromClient:ChainClient, toClient:ChainClient, action_receipt:ActionReceipt|null = null, type:string = "heavyProof"):Promise<ProofData|null> => {
//   return new Promise((resolve) => {
//     //initialize socket to proof server
//     const ws = new WebSocket(fromClient.getProofSocket())

//     const onMessage = async(event:any) => {
//       const res = JSON.parse(event.data)

//       //log non-progress messages from ibc server
//       // if (res.type !== "progress") log.info("Received message from ibc proof server", res)
//       if (res.type === "progress") log.info("Progress:", res.progress + "%")
//       if (res.type === "error") {
//         log.error("Proof Server Error:", res.error)
//         ws.close()
//         resolve(null)
//       }
//       if (res.type !== "proof") return
//       ws.close()
//       let proofResult = res as ProofDataResult
//       // log.info("got proof full result:", proofResult)
//       resolve(proofResult.proof)
//     }

//     ws.addEventListener("message", onMessage)

//     ws.addEventListener("open", (event) => {
//       log.info("Connected to ibc proof server")
//       const query = { type, block_to_prove: blockNum } as any
//       if (action_receipt) query.action_receipt = action_receipt
//       console.log("QUERY:", JSON.stringify(query, null, 2))
//       ws.send(JSON.stringify(query))
//     })
//   })
// }

// async function getReceiptDigest(receipt:any, action:any, chain:any) {
//   let eosApi = chain.session.link.transport.activeRequest.abiProvider
//   let returnValueEnabled = chain.returnValue

//   let lockAbi = await eosApi.getAbi(action.act.account)
//   abiTypes = getTypesFromAbi(createInitialTypes(), lockAbi)

//   const types = createInitialTypes()
//   const eosjsTypes = {
//     name: types.get("name"),
//     bytes: types.get("bytes"),
//     uint8: types.get("uint8"),
//     uint16: types.get("uint16"),
//     uint32: types.get("uint32"),
//     uint64: types.get("uint64"),
//     varuint32: types.get("varuint32"),
//     checksum256: types.get("checksum256")
//   }

//   const { name, uint8, uint64, varuint32, checksum256, bytes } = eosjsTypes

//   const nameToUint64 = (s) => {
//     let n = 0n
//     let i = 0
//     for (; i < 12 && s[i]; i++) n |= BigInt(char_to_symbol(s.charCodeAt(i)) & 0x1f) << BigInt(64 - 5 * (i + 1))
//     if (i == 12) n |= BigInt(char_to_symbol(s.charCodeAt(i)) & 0x0f)
//     return n.toString()
//   }
//   //if act_digest and hex_data is not part of receipt (hyperion) then calculate them
//   if (!receipt.act_digest) {
//     const buff = new SerialBuffer({ TextEncoder, TextDecoder })
//     abiTypes.get("emitxfer").serialize(buff, action.act.data)
//     let serializedTransferData = Buffer.from(buff.asUint8Array()).toString("hex")
//     action.act.hex_data = serializedTransferData

//     receipt.abi_sequence = action.abi_sequence
//     receipt.code_sequence = action.code_sequence

//     //calculate receipt digest

//     if (returnValueEnabled) {
//       let base_hash = await getBaseActionDigest(action.act)
//       let data_hash = await getDataDigest(action.act, "")

//       let buff1 = Buffer.from(base_hash, "hex")
//       let buff2 = Buffer.from(data_hash, "hex")

//       let buffFinal = Buffer.concat([buff1, buff2])
//       receipt.act_digest = await CH.createHash("sha256").update(buffFinal).digest("hex")
//     } else {
//       let actionBuffer = new SerialBuffer({ TextEncoder, TextDecoder })
//       let action2 = {
//         account: action.act.account,
//         name: action.act.name,
//         authorization: action.act.authorization,
//         data: serializedTransferData
//       }

//       abiTypes.get("action").serialize(actionBuffer, action2)
//       receipt.act_digest = await CH.createHash("sha256").update(actionBuffer.asUint8Array()).digest("hex")
//     }

//     function getBaseActionDigest(a) {
//       const buff = new SerialBuffer({ TextEncoder, TextDecoder })

//       uint64.serialize(buff, nameToUint64(a.account))
//       uint64.serialize(buff, nameToUint64(a.name))
//       varuint32.serialize(buff, a.authorization.length)

//       for (let i = 0; i < a.authorization.length; i++) {
//         uint64.serialize(buff, nameToUint64(a.authorization[i].actor))
//         uint64.serialize(buff, nameToUint64(a.authorization[i].permission))
//       }

//       return CH.createHash("sha256").update(buff.asUint8Array()).digest("hex")
//     }

//     function getDataDigest(act, returnValue) {
//       const buff = new SerialBuffer({ TextEncoder, TextDecoder })
//       bytes.serialize(buff, act.hex_data)
//       bytes.serialize(buff, returnValue)
//       return CH.createHash("sha256").update(buff.asUint8Array()).digest("hex")
//     }
//   }

//   const buff = new SerialBuffer({ TextEncoder, TextDecoder })

//   //handle different formats of receipt for dfuse (camelCase) and nodeos

//   //if receipt is in nodeos format, convert to dfuse format
//   if (receipt.act_digest && !receipt.digest) {
//     let authSequence = []
//     for (var auth of receipt.auth_sequence) authSequence.push({ accountName: auth.account, sequence: auth.sequence })

//     receipt = {
//       receiver: receipt.receiver,
//       digest: receipt.act_digest,
//       globalSequence: parseInt(receipt.global_sequence),
//       recvSequence: parseInt(receipt.recv_sequence),
//       authSequence,
//       codeSequence: action.code_sequence,
//       abiSequence: action.abi_sequence
//     }
//   }
//   name.serialize(buff, receipt.receiver)
//   checksum256.serialize(buff, receipt.digest)
//   uint64.serialize(buff, receipt.globalSequence)
//   uint64.serialize(buff, receipt.recvSequence)

//   if (receipt.authSequence) {
//     varuint32.serialize(buff, receipt.authSequence.length)
//     for (var auth of receipt.authSequence) {
//       name.serialize(buff, auth.accountName)
//       uint64.serialize(buff, auth.sequence)
//     }
//   } else varuint32.serialize(buff, 0)

//   if (receipt.codeSequence) varuint32.serialize(buff, receipt.codeSequence)
//   else varuint32.serialize(buff, 0)

//   if (receipt.abiSequence) varuint32.serialize(buff, receipt.abiSequence)
//   else varuint32.serialize(buff, 0)

//   return await CH.createHash("sha256").update(buff.asUint8Array()).digest("hex")
// }
