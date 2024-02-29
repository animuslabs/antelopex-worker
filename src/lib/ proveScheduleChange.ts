import { ChainClient, ChainClients } from "lib/eosio"
import { getScheduleProofs, makeScheduleProofAction } from "lib/ibcUtil"
import logger from "lib/logger"
const log = logger.getLogger("proveScheduleChange")

export async function proveSchedules(sourceChain:ChainClient, destinationChain:ChainClient):Promise<void> {
  log.info(`\nChecking proveSchedules ${sourceChain.name} -> ${destinationChain.name}`)
  const proofs = await getScheduleProofs(sourceChain, destinationChain)
  if (proofs.length > 0) {
    let scheduleVersion:number
    for (const p of proofs) {
      try {
        const action = makeScheduleProofAction(p, sourceChain.config)
        const tx = await destinationChain.sendAction(action)
        scheduleVersion = p.blockproof.blocktoprove.block.header.schedule_version + 1
        log.info(`Proved ${sourceChain.name} schedule (${scheduleVersion}) on ${destinationChain.name}`, tx)
      } catch (ex) {
        log.error(ex)
        break
      }
    }
  }
}
