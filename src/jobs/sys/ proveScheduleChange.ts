import { ChainClient, ChainClients } from "lib/eosio"
import { getScheduleProofs, makeScheduleProofAction } from "lib/ibcUtil"

export async function proveSchedules(sourceChain:ChainClient, destinationChain:ChainClient):Promise<void> {
  console.log(`\nChecking ${sourceChain.name} -> ${destinationChain.name}`)
  const proofs = await getScheduleProofs(sourceChain, destinationChain)
  if (proofs.length > 0) {
    let scheduleVersion:number
    for (const p of proofs) {
      try {
        const action = makeScheduleProofAction(p, sourceChain.config)
        const tx = await destinationChain.sendAction(action)
        scheduleVersion = p.blockproof.blocktoprove.block.header.schedule_version + 1
        console.log(`Proved ${sourceChain.name} schedule (${scheduleVersion}) on ${destinationChain.name}`, tx)
      } catch (ex) {
        console.error(ex)
        break
      }
    }
  }
}
