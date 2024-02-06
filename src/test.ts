import { getChainClient } from "lib/eosio"
import { getScheduleProofs } from "lib/ibcUtil"
import logger from "lib/logger"
const log = logger.getLogger("test")

const res = await getScheduleProofs(getChainClient("tlos"), getChainClient("eos"))
const res2 = await getScheduleProofs(getChainClient("eos"), getChainClient("tlos"))
const res3 = await getScheduleProofs(getChainClient("wax"), getChainClient("eos"))
const res4 = await getScheduleProofs(getChainClient("eos"), getChainClient("wax"))
log.info("info", JSON.stringify(res, null, 2))
log.info("info", JSON.stringify(res2, null, 2))
log.info("info", JSON.stringify(res3, null, 2))
log.info("info", JSON.stringify(res4, null, 2))
