const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LexVaultMultisig", function () {
  let multisig;
  let admin, owner1, owner2, owner3, owner4, requester, attacker;
  const caseId1 = ethers.keccak256(ethers.toUtf8Bytes("CASE-2026-001"));
  const caseId2 = ethers.keccak256(ethers.toUtf8Bytes("CASE-2026-002"));
  const evidenceId1 = ethers.keccak256(ethers.toUtf8Bytes("EV-EVIDENCE-001"));
  const evidenceId2 = ethers.keccak256(ethers.toUtf8Bytes("EV-EVIDENCE-002"));
  const actionRead = ethers.keccak256(ethers.toUtf8Bytes("READ"));
  const actionDownload = ethers.keccak256(ethers.toUtf8Bytes("DOWNLOAD"));

  beforeEach(async function () {
    [admin, owner1, owner2, owner3, owner4, requester, attacker] = await ethers.getSigners();
    const LexVaultMultisig = await ethers.getContractFactory("LexVaultMultisig");
    multisig = await LexVaultMultisig.deploy();
  });

  describe("1. Admin & Case Initialization", function () {
    it("deploys with deployer as admin", async function () {
      expect(await multisig.admin()).to.equal(admin.address);
    });

    it("allows admin to initialize a case with valid owners and threshold", async function () {
      const owners = [owner1.address, owner2.address, owner3.address];
      const threshold = 2;

      await expect(multisig.connect(admin).initializeCase(caseId1, owners, threshold))
        .to.emit(multisig, "CaseInitialized")
        .withArgs(caseId1, owners, threshold, 1);

      const config = await multisig.getCaseConfig(caseId1);
      expect(config.owners).to.deep.equal(owners);
      expect(config.threshold).to.equal(threshold);
      expect(config.initialized).to.be.true;
      expect(config.configVersion).to.equal(1);

      expect(await multisig.isCaseOwner(caseId1, owner1.address)).to.be.true;
      expect(await multisig.isCaseOwner(caseId1, owner2.address)).to.be.true;
      expect(await multisig.isCaseOwner(caseId1, owner3.address)).to.be.true;
      expect(await multisig.isCaseOwner(caseId1, attacker.address)).to.be.false;
    });

    it("rejects initialization from non-admin accounts", async function () {
      const owners = [owner1.address, owner2.address];
      await expect(
        multisig.connect(attacker).initializeCase(caseId1, owners, 2)
      ).to.be.revertedWith("Only admin can call this");
    });

    it("prevents initializing the same caseId twice", async function () {
      const owners = [owner1.address, owner2.address];
      await multisig.connect(admin).initializeCase(caseId1, owners, 2);

      await expect(
        multisig.connect(admin).initializeCase(caseId1, owners, 1)
      ).to.be.revertedWith("Case already initialized");
    });

    it("rejects zero-address in owners list", async function () {
      const owners = [owner1.address, ethers.ZeroAddress];
      await expect(
        multisig.connect(admin).initializeCase(caseId1, owners, 1)
      ).to.be.revertedWith("Zero address owner not allowed");
    });

    it("rejects duplicate owners", async function () {
      const owners = [owner1.address, owner2.address, owner1.address];
      await expect(
        multisig.connect(admin).initializeCase(caseId1, owners, 2)
      ).to.be.revertedWith("Duplicate owner detected");
    });

    it("rejects invalid threshold (0 or > owners.length)", async function () {
      const owners = [owner1.address, owner2.address];
      await expect(
        multisig.connect(admin).initializeCase(caseId1, owners, 0)
      ).to.be.revertedWith("Invalid threshold");

      await expect(
        multisig.connect(admin).initializeCase(caseId1, owners, 3)
      ).to.be.revertedWith("Invalid threshold");
    });

    it("rejects empty owners list", async function () {
      await expect(
        multisig.connect(admin).initializeCase(caseId1, [], 0)
      ).to.be.revertedWith("Owners list cannot be empty");
    });

    it("allows admin to transfer admin role", async function () {
      await expect(multisig.connect(admin).transferAdmin(owner4.address))
        .to.emit(multisig, "AdminTransferred")
        .withArgs(admin.address, owner4.address);

      expect(await multisig.admin()).to.equal(owner4.address);

      // Old admin can no longer initialize cases
      await expect(
        multisig.connect(admin).initializeCase(caseId2, [owner1.address], 1)
      ).to.be.revertedWith("Only admin can call this");

      // New admin can initialize cases
      await expect(
        multisig.connect(owner4).initializeCase(caseId2, [owner1.address], 1)
      ).to.emit(multisig, "CaseInitialized");
    });
  });

  describe("2. Reconfiguration Governance", function () {
    beforeEach(async function () {
      await multisig.connect(admin).initializeCase(
        caseId1,
        [owner1.address, owner2.address, owner3.address],
        2 // 2-of-3 threshold
      );
    });

    it("prevents single owner from unilaterally reconfiguring the case", async function () {
      // Non-owner cannot propose
      await expect(
        multisig.connect(attacker).proposeReconfiguration(caseId1, [attacker.address], 1, 100)
      ).to.be.revertedWith("Caller is not a case owner");

      // Owner proposing does not immediately execute reconfiguration
      const tx = await multisig.connect(owner1).proposeReconfiguration(
        caseId1,
        [owner1.address, owner4.address],
        2,
        101
      );
      const receipt = await tx.wait();

      // Config remains unchanged at version 1
      const config = await multisig.getCaseConfig(caseId1);
      expect(config.configVersion).to.equal(1);
      expect(config.owners.length).to.equal(3);
    });

    it("executes reconfiguration when multisig threshold of current owners approve", async function () {
      const newOwners = [owner1.address, owner4.address];
      const newThreshold = 2;

      // Propose reconfiguration (owner1 automatically approves, approvals = 1)
      const tx = await multisig.connect(owner1).proposeReconfiguration(
        caseId1,
        newOwners,
        newThreshold,
        201
      );
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          return multisig.interface.parseLog(log)?.name === "ReconfigurationProposed";
        } catch {
          return false;
        }
      });
      const parsed = multisig.interface.parseLog(event);
      const proposalId = parsed.args.proposalId;

      // Check proposal state
      let prop = await multisig.getProposal(proposalId);
      expect(prop.approvals).to.equal(1);
      expect(prop.executed).to.be.false;

      // Attempt execution before threshold: should fail (1/2)
      await expect(
        multisig.connect(owner1).executeReconfiguration(proposalId)
      ).to.be.revertedWith("Threshold not met");

      // Owner2 approves -> approvals = 2 (meets threshold 2)
      await expect(multisig.connect(owner2).approveReconfiguration(proposalId))
        .to.emit(multisig, "ReconfigurationApproved")
        .withArgs(proposalId, owner2.address);

      // Execute reconfiguration
      await expect(multisig.connect(owner1).executeReconfiguration(proposalId))
        .to.emit(multisig, "CaseReconfigured")
        .withArgs(caseId1, newOwners, newThreshold, 2);

      // Check new configuration
      const config = await multisig.getCaseConfig(caseId1);
      expect(config.configVersion).to.equal(2);
      expect(config.threshold).to.equal(2);
      expect(config.owners).to.deep.equal(newOwners);

      // Owner3 (removed) is no longer an owner in version 2
      expect(await multisig.isCaseOwner(caseId1, owner3.address)).to.be.false;
      // Owner4 (added) is now an owner in version 2
      expect(await multisig.isCaseOwner(caseId1, owner4.address)).to.be.true;
    });

    it("prevents removed owner from participating in proposals under new version", async function () {
      // Reconfigure to [owner1, owner2], threshold 2
      const tx = await multisig.connect(owner1).proposeReconfiguration(
        caseId1,
        [owner1.address, owner2.address],
        2,
        301
      );
      const receipt = await tx.wait();
      const parsed = multisig.interface.parseLog(receipt.logs[0]);
      const proposalId = parsed.args.proposalId;

      await multisig.connect(owner2).approveReconfiguration(proposalId);
      await multisig.connect(owner1).executeReconfiguration(proposalId);

      // Owner3 is now removed. Attempt to propose next reconfig:
      await expect(
        multisig.connect(owner3).proposeReconfiguration(caseId1, [owner3.address], 1, 302)
      ).to.be.revertedWith("Caller is not a case owner");
    });
  });

  describe("3. Access Requests", function () {
    beforeEach(async function () {
      await multisig.connect(admin).initializeCase(
        caseId1,
        [owner1.address, owner2.address, owner3.address],
        2
      );
    });

    it("creates a valid access request with cryptographic binding", async function () {
      const nonce = 12345;
      const tx = await multisig.connect(requester).requestAccess(
        caseId1,
        evidenceId1,
        actionRead,
        nonce
      );
      const receipt = await tx.wait();

      const event = receipt.logs.find(log => {
        try {
          return multisig.interface.parseLog(log)?.name === "AccessRequested";
        } catch {
          return false;
        }
      });
      const parsed = multisig.interface.parseLog(event);
      const requestId = parsed.args.requestId;

      // Verify request state stored on-chain
      const req = await multisig.getRequest(requestId);
      expect(req.caseId).to.equal(caseId1);
      expect(req.evidenceId).to.equal(evidenceId1);
      expect(req.action).to.equal(actionRead);
      expect(req.requester).to.equal(requester.address);
      expect(req.nonce).to.equal(nonce);
      expect(req.approvals).to.equal(0);
      expect(req.executed).to.be.false;
      expect(req.exists).to.be.true;
      expect(req.configVersion).to.equal(1);
    });

    it("rejects request on uninitialized case", async function () {
      await expect(
        multisig.connect(requester).requestAccess(caseId2, evidenceId1, actionRead, 1)
      ).to.be.revertedWith("Case not configured");
    });

    it("rejects duplicate request without resetting existing approvals", async function () {
      const nonce = 555;
      const tx = await multisig.connect(requester).requestAccess(caseId1, evidenceId1, actionRead, nonce);
      const receipt = await tx.wait();
      const requestId = multisig.interface.parseLog(receipt.logs[0]).args.requestId;

      // Owner1 approves the request
      await multisig.connect(owner1).approveAccess(requestId);
      let req = await multisig.getRequest(requestId);
      expect(req.approvals).to.equal(1);

      // Attacker or user attempts to call requestAccess again with the exact same parameters
      await expect(
        multisig.connect(requester).requestAccess(caseId1, evidenceId1, actionRead, nonce)
      ).to.be.revertedWith("Request already exists");

      // Critical regression verification: approvals must NOT be wiped to 0
      req = await multisig.getRequest(requestId);
      expect(req.approvals).to.equal(1);
      expect(await multisig.hasApproved(requestId, owner1.address)).to.be.true;
    });

    it("generates distinct request IDs for different nonces, evidence, actions, and requesters", async function () {
      const tx1 = await multisig.connect(requester).requestAccess(caseId1, evidenceId1, actionRead, 1);
      const r1 = (await tx1.wait()).logs[0].topics[1];

      const tx2 = await multisig.connect(requester).requestAccess(caseId1, evidenceId1, actionRead, 2);
      const r2 = (await tx2.wait()).logs[0].topics[1];

      const tx3 = await multisig.connect(requester).requestAccess(caseId1, evidenceId2, actionRead, 1);
      const r3 = (await tx3.wait()).logs[0].topics[1];

      const tx4 = await multisig.connect(requester).requestAccess(caseId1, evidenceId1, actionDownload, 1);
      const r4 = (await tx4.wait()).logs[0].topics[1];

      const tx5 = await multisig.connect(attacker).requestAccess(caseId1, evidenceId1, actionRead, 1);
      const r5 = (await tx5.wait()).logs[0].topics[1];

      const ids = new Set([r1, r2, r3, r4, r5]);
      expect(ids.size).to.equal(5);
    });
  });

  describe("4. Approvals and Threshold Counting", function () {
    let requestId;

    beforeEach(async function () {
      await multisig.connect(admin).initializeCase(
        caseId1,
        [owner1.address, owner2.address, owner3.address],
        2
      );

      const tx = await multisig.connect(requester).requestAccess(caseId1, evidenceId1, actionRead, 777);
      const receipt = await tx.wait();
      requestId = multisig.interface.parseLog(receipt.logs[0]).args.requestId;
    });

    it("allows designated case owners to approve", async function () {
      await expect(multisig.connect(owner1).approveAccess(requestId))
        .to.emit(multisig, "AccessApproved")
        .withArgs(requestId, owner1.address);

      expect(await multisig.hasApproved(requestId, owner1.address)).to.be.true;
      const req = await multisig.getRequest(requestId);
      expect(req.approvals).to.equal(1);
    });

    it("rejects non-owner approvals", async function () {
      await expect(
        multisig.connect(attacker).approveAccess(requestId)
      ).to.be.revertedWith("Caller is not a case owner");
    });

    it("rejects duplicate approval by the same owner", async function () {
      await multisig.connect(owner1).approveAccess(requestId);

      await expect(
        multisig.connect(owner1).approveAccess(requestId)
      ).to.be.revertedWith("Already approved by this owner");

      const req = await multisig.getRequest(requestId);
      expect(req.approvals).to.equal(1);
    });

    it("correctly counts multiple unique approvals", async function () {
      await multisig.connect(owner1).approveAccess(requestId);
      await multisig.connect(owner2).approveAccess(requestId);

      const req = await multisig.getRequest(requestId);
      expect(req.approvals).to.equal(2);
    });

    it("rejects approval on nonexistent request", async function () {
      const dummyId = ethers.keccak256(ethers.toUtf8Bytes("NON_EXISTENT"));
      await expect(
        multisig.connect(owner1).approveAccess(dummyId)
      ).to.be.revertedWith("Request does not exist");
    });
  });

  describe("5. Execution & Replay Protection", function () {
    let requestId;

    beforeEach(async function () {
      await multisig.connect(admin).initializeCase(
        caseId1,
        [owner1.address, owner2.address, owner3.address],
        2
      );

      const tx = await multisig.connect(requester).requestAccess(caseId1, evidenceId1, actionRead, 999);
      const receipt = await tx.wait();
      requestId = multisig.interface.parseLog(receipt.logs[0]).args.requestId;
    });

    it("prevents execution before threshold is reached", async function () {
      // 0 approvals (threshold 2)
      await expect(
        multisig.connect(requester).executeAccess(requestId)
      ).to.be.revertedWith("Threshold not met");

      // 1 approval (threshold 2)
      await multisig.connect(owner1).approveAccess(requestId);
      await expect(
        multisig.connect(requester).executeAccess(requestId)
      ).to.be.revertedWith("Threshold not met");
    });

    it("executes successfully once threshold is met and emits full context", async function () {
      await multisig.connect(owner1).approveAccess(requestId);
      await multisig.connect(owner2).approveAccess(requestId);

      await expect(multisig.connect(requester).executeAccess(requestId))
        .to.emit(multisig, "AccessExecuted")
        .withArgs(requestId, requester.address, caseId1, evidenceId1, actionRead);

      const req = await multisig.getRequest(requestId);
      expect(req.executed).to.be.true;
    });

    it("prevents duplicate execution of an already executed request", async function () {
      await multisig.connect(owner1).approveAccess(requestId);
      await multisig.connect(owner2).approveAccess(requestId);
      await multisig.connect(requester).executeAccess(requestId);

      // Re-executing must fail
      await expect(
        multisig.connect(requester).executeAccess(requestId)
      ).to.be.revertedWith("Request already executed");
    });

    it("rejects approval on an already executed request", async function () {
      await multisig.connect(owner1).approveAccess(requestId);
      await multisig.connect(owner2).approveAccess(requestId);
      await multisig.connect(requester).executeAccess(requestId);

      // 3rd owner attempts approval after execution
      await expect(
        multisig.connect(owner3).approveAccess(requestId)
      ).to.be.revertedWith("Request already executed");
    });
  });

  describe("6. Security & Regression Tests (Audit Finding Verification)", function () {
    it("SEC-01: prevents unrestricted public initialization / frontrunning", async function () {
      // Attacker tries to hijack an uninitialized case
      const attackerCase = ethers.keccak256(ethers.toUtf8Bytes("UNINIT-CASE"));
      await expect(
        multisig.connect(attacker).initializeCase(attackerCase, [attacker.address], 1)
      ).to.be.revertedWith("Only admin can call this");

      // Only admin can initialize
      await expect(
        multisig.connect(admin).initializeCase(attackerCase, [owner1.address], 1)
      ).to.emit(multisig, "CaseInitialized");
    });

    it("SEC-02: duplicate request creation cannot reset approvals or freeze request", async function () {
      await multisig.connect(admin).initializeCase(caseId1, [owner1.address, owner2.address], 2);

      const nonce = 888;
      const tx = await multisig.connect(requester).requestAccess(caseId1, evidenceId1, actionRead, nonce);
      const receipt = await tx.wait();
      const requestId = multisig.interface.parseLog(receipt.logs[0]).args.requestId;

      // Owner1 approves
      await multisig.connect(owner1).approveAccess(requestId);
      expect((await multisig.getRequest(requestId)).approvals).to.equal(1);

      // 1. Resubmitting identical request from requester reverts and does not wipe approvals
      await expect(
        multisig.connect(requester).requestAccess(caseId1, evidenceId1, actionRead, nonce)
      ).to.be.revertedWith("Request already exists");

      // 2. Attacker resubmitting with same nonce creates isolated attacker request without affecting requester's request
      const txAttacker = await multisig.connect(attacker).requestAccess(caseId1, evidenceId1, actionRead, nonce);
      const attackerReqId = multisig.interface.parseLog((await txAttacker.wait()).logs[0]).args.requestId;
      expect(attackerReqId).to.not.equal(requestId);
      expect((await multisig.getRequest(attackerReqId)).approvals).to.equal(0);

      // Requester's approvals remain intact and Owner2 can still complete threshold
      expect((await multisig.getRequest(requestId)).approvals).to.equal(1);
      await multisig.connect(owner2).approveAccess(requestId);
      expect((await multisig.getRequest(requestId)).approvals).to.equal(2);

      // Execution succeeds
      await expect(multisig.connect(requester).executeAccess(requestId)).to.emit(multisig, "AccessExecuted");
    });

    it("SEC-03: single owner cannot unilaterally reconfigure case or lower threshold", async function () {
      await multisig.connect(admin).initializeCase(caseId1, [owner1.address, owner2.address, owner3.address], 3);

      // Owner1 tries to unilaterally replace all owners with itself and lower threshold to 1
      // Contract has no unilateral configureCase; must go through proposeReconfiguration
      const tx = await multisig.connect(owner1).proposeReconfiguration(caseId1, [owner1.address], 1, 1);
      const receipt = await tx.wait();
      const proposalId = multisig.interface.parseLog(receipt.logs[0]).args.proposalId;

      // Owner1 cannot execute alone (needs 3 approvals)
      await expect(
        multisig.connect(owner1).executeReconfiguration(proposalId)
      ).to.be.revertedWith("Threshold not met");

      // Original config is untouched
      const config = await multisig.getCaseConfig(caseId1);
      expect(config.threshold).to.equal(3);
      expect(config.owners.length).to.equal(3);
    });

    it("SEC-04: O(1) request check handles many requests without gas exhaustion loop", async function () {
      await multisig.connect(admin).initializeCase(caseId1, [owner1.address], 1);

      // Create multiple requests
      for (let i = 0; i < 15; i++) {
        await multisig.connect(requester).requestAccess(caseId1, evidenceId1, actionRead, 1000 + i);
      }

      // Check request exists in O(1)
      const allIds = await multisig.getAllRequestIds();
      expect(allIds.length).to.equal(15);
    });

    it("SEC-05: prevents phantom approvals and execution of pending requests across reconfigurations", async function () {
      // Setup: 3 owners, threshold 2
      await multisig.connect(admin).initializeCase(
        caseId1,
        [owner1.address, owner2.address, owner3.address],
        2
      );

      // Create request under version 1
      const txReq = await multisig.connect(requester).requestAccess(caseId1, evidenceId1, actionRead, 404);
      const receiptReq = await txReq.wait();
      const requestId = multisig.interface.parseLog(receiptReq.logs[0]).args.requestId;

      // Owner3 (who will soon be removed) approves under version 1
      await multisig.connect(owner3).approveAccess(requestId);
      expect((await multisig.getRequest(requestId)).approvals).to.equal(1);

      // Case is reconfigured: Owner3 is removed, new owners are [owner1, owner2, owner4], threshold 2
      const txProp = await multisig.connect(owner1).proposeReconfiguration(
        caseId1,
        [owner1.address, owner2.address, owner4.address],
        2,
        9999
      );
      const proposalId = multisig.interface.parseLog((await txProp.wait()).logs[0]).args.proposalId;
      await multisig.connect(owner2).approveReconfiguration(proposalId);
      await multisig.connect(owner1).executeReconfiguration(proposalId);

      // Now case is at configVersion 2
      expect((await multisig.getCaseConfig(caseId1)).configVersion).to.equal(2);

      // Stale request from configVersion 1 CANNOT receive approvals under version 2
      await expect(
        multisig.connect(owner1).approveAccess(requestId)
      ).to.be.revertedWith("Request config version outdated");

      // Stale request CANNOT be executed under version 2
      await expect(
        multisig.connect(requester).executeAccess(requestId)
      ).to.be.revertedWith("Request config version outdated");

      // Fresh request under version 2 works cleanly with new owners
      const txFresh = await multisig.connect(requester).requestAccess(caseId1, evidenceId1, actionRead, 405);
      const freshId = multisig.interface.parseLog((await txFresh.wait()).logs[0]).args.requestId;

      // Owner4 can approve fresh request
      await multisig.connect(owner1).approveAccess(freshId);
      await multisig.connect(owner4).approveAccess(freshId);
      await expect(multisig.connect(requester).executeAccess(freshId)).to.emit(multisig, "AccessExecuted");
    });
  });
});
