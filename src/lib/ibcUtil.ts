// const emitxferProof = await getProof({
//   type: "heavyProof",
//   action: emitxferAction,
//   block_to_prove: result.processed.block_num //block that includes the emitxfer action we want to prove
// });
// console.log("emitxferProof",emitxferProof)

// //submit proof to destination chain's bridge contract
// destinationActions = [...scheduleProofs, emitxferProof];
// submitProof();

getScheduleProofs = async(transferBlock) => {
  async function getProducerScheduleBlock(blocknum) {
    try {
      const sourceAPIURL = sourceChain.nodeUrl + "/v1/chain"
      let header = await $.post(sourceAPIURL + "/get_block", JSON.stringify({ "block_num_or_id": blocknum, "json": true }))
      let target_schedule = header.schedule_version

      let min_block = 2
      //fetch last proved block to use as min block for schedule change search
      const lastBlockProved = await $.post(destinationChain.nodeUrl + "/v1/chain/get_table_rows", JSON.stringify({
        code: destinationChain.bridgeContract,
        table: "lastproofs",
        scope: sourceChain.name,
        limit: 1,
        reverse: true,
        show_payer: false,
        json: true
      }))

      if (lastBlockProved && lastBlockProved.rows[0]) min_block = lastBlockProved.rows[0].block_height

      let max_block = blocknum

      //detect active schedule change
      while (max_block - min_block > 1) {
        blocknum = Math.round((max_block + min_block) / 2)
        try {
          header = await $.post(sourceAPIURL + "/get_block", JSON.stringify({ "block_num_or_id": blocknum, "json": true }))
          if (header.schedule_version < target_schedule) min_block = blocknum
          else max_block = blocknum
        } catch (ex) { console.log("Internet connection lost, retrying") }
      }
      if (blocknum > 337) blocknum -= 337
      //search before active schedule change for new_producer_schedule
      let bCount = 0 //since header already checked once above
      while (blocknum < max_block && (!("new_producer_schedule" in header) && !header.new_producers)) {
        try {
          header = await $.post(sourceAPIURL + "/get_block", JSON.stringify({ "block_num_or_id": blocknum, "json": true }))
          bCount++
          blocknum++
        } catch (ex) { console.log("Internet connection lost, retrying") }
      }
      blocknum = header.block_num
      return blocknum
    } catch (ex) { console.log("getProducerScheduleBlock ex", ex); return null }
  }

  const proofs = []
  const bridgeScheduleData = await $.post(destinationChain.nodeUrl + "/v1/chain/get_table_rows", JSON.stringify({
    code: destinationChain.bridgeContract,
    table: "schedules",
    scope: sourceChain.name,
    limit: 1,
    reverse: true,
    show_payer: false,
    json: true
  }))
  console.log("bridgeScheduleData", bridgeScheduleData)

  let last_proven_schedule_version = 0
  // if (bridgeScheduleData.rows.length > 0) last_proven_schedule_version = bridgeScheduleData.rows[0].producer_schedule.version;
  if (bridgeScheduleData.rows.length > 0) last_proven_schedule_version = bridgeScheduleData.rows[0].version
  if (!last_proven_schedule_version) return console.log("No Schedule Found in Contract!")
  console.log("Last proved source schedule:", last_proven_schedule_version)

  let schedule = (await $.get(sourceChain.nodeUrl + "/v1/chain/get_producer_schedule"))
  let schedule_version = parseInt(schedule.active.version)
  console.log("Source active schedule:", schedule_version)
  console.log("Pending schedule:", schedule.pending ? "True" : "False")

  let head = (await $.get(sourceChain.nodeUrl + "/v1/chain/get_info")).head_block_num


  let schedule_block = head + 0
  console.log("head", head)
  while (schedule_version > last_proven_schedule_version) {
    $("#status").append(`<div><div>Locating block header with producer schedule (v${schedule_version})</div><div class="progressDiv">0%</div></div>`)
    let block_num = await getProducerScheduleBlock(schedule_block)
    if (!block_num) return //should never occur
    $(".progressDiv").last().html("100%")
    $("#status").append(`<div><div>Fetching proof for active schedule (v${schedule_version})</div><div class="progressDiv">0%</div></div>`)
    let proof = await getProof({ block_to_prove: block_num })
    schedule_version = proof.data.blockproof.blocktoprove.block.header.schedule_version
    schedule_block = block_num
    proofs.unshift(proof)
  };

  // check for pending schedule and prove pending schedule if found;
  if (schedule.pending) {
    $("#status").append("<div><div>Fetching proof for pending schedule</div><div class=\"progressDiv\">0%</div>")

    let newPendingBlockHeader = null
    let currentBlock = transferBlock + 0
    while (!newPendingBlockHeader) {
      let bHeader = (await $.post(`${sourceChain.nodeUrl}/v1/chain/get_block`, JSON.stringify({ block_num_or_id: currentBlock })))
      if (bHeader.new_producer_schedule) newPendingBlockHeader = bHeader
      else currentBlock--
    }
    let pendingProof = await getProof({ block_to_prove: newPendingBlockHeader.block_num })
    proofs.push(pendingProof) //push pending after proving active
  }

  return proofs
}

const getProof = ({ type = "heavyProof", block_to_prove, action }) => {
  return new Promise(resolve => {
    //initialize socket to proof server
    const ws = new WebSocket(sourceChain.proofSocket)
    ws.addEventListener("open", (event) => {
      // connected to websocket server
      const query = { type, block_to_prove }
      if (action) query.action_receipt = action.receipt
      ws.send(JSON.stringify(query))
    })

    //messages from websocket server
    ws.addEventListener("message", (event) => {
      const res = JSON.parse(event.data)
      //log non-progress messages from ibc server
      if (res.type !== "progress") console.log("Received message from ibc proof server", res)
      if (res.type == "progress") $(".progressDiv").last().html(res.progress + "%")
      if (res.type !== "proof") return
      ws.close()

      $(".progressDiv").last().html("100%")
      //handle issue/withdraw if proving transfer/retire 's emitxfer action, else submit block proof to bridge directly (for schedules)
      const actionToSubmit = {
        authorization: [destinationChain.auth],
        name: !action ? "checkproofd" : tokenRow.native ? "issuea" : "withdrawa",
        account: !action ? destinationChain.bridgeContract : tokenRow.native ? tokenRow.pairedWrapTokenContract : tokenRow.wrapLockContract,
        data: { ...res.proof, prover: destinationChain.auth.actor }
      }

      //if proving an action, add action and formatted receipt to actionproof object
      if (action) {
        let auth_sequence = []
        for (let authSequence of action.receipt.auth_sequence) auth_sequence.push({ account: authSequence[0], sequence: authSequence[1] })
        actionToSubmit.data.actionproof = {
          ...res.proof.actionproof,
          action: {
            account: action.act.account,
            name: action.act.name,
            authorization: action.act.authorization,
            data: action.act.hex_data
          },
          receipt: { ...action.receipt, auth_sequence }
        }
      }
      resolve(actionToSubmit)
    })
  })
}

const submitProof = async() => {
  $("#status").append("<div><div>Submitting proof(s)<span class=\"proofTx\" style=\"margin-left:12px\"></span></div> <div class=\"progressDiv\">0%</div></div>")
  $("#resetBtn").hide()
  try {
    console.log("destinationActions", destinationActions)
    const signedDestinationTx = await destinationChain.session.transact({ actions: destinationActions }, { broadcast: false, expireSeconds: 360, blocksBehind: 3 })
    $(".progressDiv").last().html("50%")

    submitTx(signedDestinationTx, destinationChain, 6).then(async result => {
      $(".progressDiv").last().html("100%")
      $(".btn-warning").prop("disabled", true)

      console.log("result", result)
      $(".proofTx").last().html(`<a target="_blank" style="color:#1a8754" href="${destinationChain.txExplorer}/${result.processed.id}">Proof TX<a>`)
      $("#resetBtn").show()
    })
  } catch (ex) { //catch signing errors
    $(".progressDiv").last().html("Error")
    console.log("Error signing transaction")
    if (progressInterval) clearInterval(progressInterval)
    $(".btn-warning").last().addClass("is-disabled")
    $(".btn-warning").last().prop("disabled", true)
    $("#status").append("<br><div><div>Error signing TX</div><div> <button class=\"btn btn-warning btn-sm\" style=\"width:54px;--bs-btn-padding-y: 0.125rem;\" onclick=\"submitProof()\">Retry</button></div></div>")
    $("#resetBtn").show()
  }
}
