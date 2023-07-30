import { ChainClient } from "lib/eosio"
import { getHypClient } from "lib/hyp"
import { Lastproof } from "lib/types/ibc.prove.types"
import { ActionReceipt } from "lib/types/ibc.types"
import { throwErr } from "lib/utils"
import WebSocket from "ws"
export interface Chains {from:ChainClient, to:ChainClient}
export interface ProofQuery {block_to_prove:number, last_proven_block?:number, action_receipt_digest?:number, type:string, action_receipt:ActionReceipt}
export interface GetProofQuery { type:string, block_to_prove:number, action?:any, last_proven_block?:number, action_receipt_digest:any }

export async function getLastProvenBlock(chain:Chains):Promise<number> {
  let scope:string = chain.from.config.chain
  if (chain.from.config.chain == "telos") scope = "tlos"
  const rows = await chain.to.getTableRows({ reverse: true, code: chain.to.config.contracts.bridge, scope, table: "lastproofs", limit: 1, type: Lastproof })
  const row = rows[0]
  if (!row) throwErr(`No lastproved record found in table ${chain.from.config.chain}`)
  return row.block_height.toNumber()
}

export async function getActionBlockData(chain:Chains, tx_id:string, action_name:string, light_proof = false):Promise<{block_to_prove:number, last_proven_block?:number}> {
  const trx = await getHypClient(chain.from.config.chain).getTrx(tx_id)
  if (!trx) throwErr(`Transaction not found in ${chain.from.config.chain}: ${tx_id}`)
  const act = trx.actions.find(a => a.act.name == action_name)
  if (!act) throwErr(`Could not find action ${action_name}`)
  const data:any = { block_to_prove: act.block_num }
  if (light_proof) data.last_proven_block = await getLastProvenBlock(chain)
  return data
}

export async function getProof(chain:ChainClient, queryData:GetProofQuery) {
  return new Promise((resolve, reject) => {
    //initialize socket to proof server
    const ws = new WebSocket(chain.getProofSocket())

    ws.addEventListener("open", (event) => {
      // connected to websocket server
      const query:Partial<ProofQuery> = { type: queryData.type, block_to_prove: queryData.block_to_prove }
      if (queryData.type === "lightProof") query.last_proven_block = queryData.last_proven_block
      if (queryData.action_receipt_digest) query.action_receipt_digest = queryData.action_receipt_digest
      if (queryData.action) query.action_receipt = queryData.action.receipt
      ws.send(JSON.stringify(query))
      // console.log(JSON.stringify(query, null, 2))
    })

    //messages from websocket server
    ws.addEventListener("message", (event:any) => {
      const res = JSON.parse(event.data)
      //log non-progress messages from ibc server
      // if (res.type !== "progress") console.log("Received message from ibc proof server", res)
      // if (res.type =='progress') $('.progressDiv').last().html(res.progress +"%");
      if (res.type === "error") reject(res.error)
      if (res.type !== "proof") return
      ws.close()
      resolve(res)
    })
  })
}

export async function getProveActionData(chain:ChainClient, request_data:any, proof_data:any) {
  const actionData = {
    authorization: [{
      actor: chain.config.worker.account,
      permission: chain.config.worker.permission
    }],
    name: "prove",
    account: chain.config.contracts.bridge,
    data: { ...proof_data.proof, prover: chain.config.worker.account }
  }

  let auth_sequence = []
  for (let authSequence of request_data.action.receipt.auth_sequence) auth_sequence.push({ account: authSequence[0], sequence: authSequence[1] })
  actionData.data.actionproof = {
    ...proof_data.proof.actionproof,
    action: {
      account: request_data.action.account,
      name: request_data.action.name,
      authorization: request_data.action.authorization,
      data: request_data.action.data
    },
    receipt: { ...request_data.action.receipt }
  }

  return actionData
}






// Maybe use this instead of hyperion?
export async function getProofRequestData(chain:Chains, tx_id:string, action_name:string, receiver:string, type = "heavyProof"):Promise<GetProofQuery> {
  const block_data = await getActionBlockData(chain, tx_id, action_name, (type === "lightProof"))
  // console.log("block_data", block_data)

  if (!block_data.block_to_prove) throwErr("missing block_to_prove")
  return new Promise((resolve, reject) => {
    //initialize socket to proof server
    const ws = new WebSocket(chain.from.getProofSocket())

    ws.addEventListener("open", async(event) => {
      // connected to websocket server
      const query = { type: "getBlockActions", block_to_prove: block_data.block_to_prove }
      ws.send(JSON.stringify(query))
    })

    ws.addEventListener("error", (event) => {
      console.error(`WebSocket error: ${event.message}`)
    })

    //messages from websocket server
    ws.addEventListener("message", (event:any) => {
      const res = JSON.parse(event.data)
      //log non-progress messages from ibc server
      // if (res.type !== "progress") console.log("Received message from ibc getBlockActions", res)
      if (res.type === "error") reject(res.error)
      if (res.type !== "getBlockActions") return
      ws.close()
      const action_receipt = res.txs.filter((t:any) => {
        return t[0].transactionId === tx_id
      })
      const action_data = action_receipt[0].find((a:any) => {
        return a.receiver === receiver && a.action.name == action_name
      })
      // console.log("action data ", JSON.stringify(action_data, null, 2))
      const action = action_data.action
      action.receipt = action_data.receipt
      const action_receipt_digest = action_data.action_receipt_digest
      resolve({ type, action, action_receipt_digest, ...block_data })
    })
  })
}
