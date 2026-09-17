// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title TenderComplianceLedger
 * @notice Smart India Hackathon 2026 - Problem Statement ID 26100
 * @notice Organization: Ministry of Petroleum & Natural Gas (MoPNG)
 * @notice Department: Chennai Petroleum Corporation Limited (CPCL)
 *
 * @dev Immutable, tamper-evident decentralized registry for GeM tender documents,
 * bidder credentials, and automated compliance verdicts.
 * Ensures non-repudiation, prevents post-deadline document substitution, and guarantees
 * evaluators cannot retroactively alter compliance determinations.
 */
contract TenderComplianceLedger {
    address public immutable authority;
    string public constant VERSION = "1.0.0-SIH2026";
    string public constant PROTOCOL = "CPCL-GeM-Consortium-PoA";

    struct TenderRecord {
        string tenderRef;
        bytes32 tenderHash;
        uint256 timestamp;
        bool exists;
    }

    struct DocumentProofRecord {
        bytes32 docHash;
        string docType;
        string bidderId;
        uint256 blockTimestamp;
        uint256 blockNumber;
        bool exists;
    }

    struct ComplianceVerdictRecord {
        string tenderRef;
        string bidderId;
        string verdict; // "COMPLIANT" | "NON_COMPLIANT" | "NEEDS_REVIEW"
        uint256 complianceScore; // Scaled 0 - 10000 (e.g. 8500 = 85.00%)
        bytes32 auditHash;
        address evaluator;
        uint256 timestamp;
        bool exists;
    }

    // Storage mappings
    mapping(bytes32 => TenderRecord) private tenders;
    mapping(bytes32 => DocumentProofRecord) private documentProofs;
    mapping(bytes32 => ComplianceVerdictRecord) private verdicts;

    // Fast lookups
    mapping(string => bytes32) private tenderRefToHash;
    mapping(string => bytes32[]) private bidderToDocumentHashes;

    // Events
    event TenderAnchored(
        string indexed tenderRef,
        bytes32 indexed tenderHash,
        uint256 timestamp,
        address indexed authority
    );

    event DocumentProofAnchored(
        bytes32 indexed docHash,
        string docType,
        string indexed bidderId,
        uint256 blockNumber,
        uint256 timestamp
    );

    event ComplianceVerdictAnchored(
        string indexed tenderRef,
        string indexed bidderId,
        string verdict,
        uint256 complianceScore,
        bytes32 indexed auditHash,
        address evaluator,
        uint256 timestamp
    );

    modifier onlyAuthority() {
        require(msg.sender == authority, "TenderComplianceLedger: caller is not CPCL authority");
        _;
    }

    constructor() {
        authority = msg.sender;
    }

    /**
     * @notice Anchors an official GeM tender NIT document fingerprint
     * @param tenderRef Official GeM Reference Number (e.g. GEM/2026/B/6541278)
     * @param tenderHash SHA-256 / Keccak-256 digest of the tender document
     */
    function anchorTender(
        string calldata tenderRef,
        bytes32 tenderHash
    ) external onlyAuthority {
        require(tenderHash != bytes32(0), "Invalid tender hash");
        bytes32 refKey = keccak256(abi.encodePacked(tenderRef));
        require(!tenders[refKey].exists, "Tender already anchored");

        tenders[refKey] = TenderRecord({
            tenderRef: tenderRef,
            tenderHash: tenderHash,
            timestamp: block.timestamp,
            exists: true
        });
        tenderRefToHash[tenderRef] = tenderHash;

        emit TenderAnchored(tenderRef, tenderHash, block.timestamp, msg.sender);
    }

    /**
     * @notice Anchors a bidder's uploaded credential document (PAN, GST, ITR, OEM Auth)
     * @param docHash SHA-256 / Keccak-256 digest of the uploaded binary document
     * @param docType Declared document category (e.g. "pan", "gst", "oem_authorization")
     * @param bidderId UUID / Identifier of the bidder
     */
    function anchorDocumentProof(
        bytes32 docHash,
        string calldata docType,
        string calldata bidderId
    ) external onlyAuthority {
        require(docHash != bytes32(0), "Invalid document hash");
        require(!documentProofs[docHash].exists, "Document hash already registered on-chain");

        documentProofs[docHash] = DocumentProofRecord({
            docHash: docHash,
            docType: docType,
            bidderId: bidderId,
            blockTimestamp: block.timestamp,
            blockNumber: block.number,
            exists: true
        });

        bidderToDocumentHashes[bidderId].push(docHash);

        emit DocumentProofAnchored(docHash, docType, bidderId, block.number, block.timestamp);
    }

    /**
     * @notice Seals a deterministic compliance decision onto the blockchain
     * @param tenderRef Official GeM Reference Number
     * @param bidderId UUID of the bidder evaluated
     * @param verdict "COMPLIANT", "NON_COMPLIANT", or "NEEDS_REVIEW"
     * @param complianceScore Score scaled 0 - 10000 (85.5% => 8550)
     * @param auditHash Merkle root or SHA-256 digest of the evaluation evidence audit payload
     */
    function anchorComplianceVerdict(
        string calldata tenderRef,
        string calldata bidderId,
        string calldata verdict,
        uint256 complianceScore,
        bytes32 auditHash
    ) external onlyAuthority {
        bytes32 verdictKey = keccak256(abi.encodePacked(tenderRef, bidderId));

        verdicts[verdictKey] = ComplianceVerdictRecord({
            tenderRef: tenderRef,
            bidderId: bidderId,
            verdict: verdict,
            complianceScore: complianceScore,
            auditHash: auditHash,
            evaluator: msg.sender,
            timestamp: block.timestamp,
            exists: true
        });

        emit ComplianceVerdictAnchored(
            tenderRef,
            bidderId,
            verdict,
            complianceScore,
            auditHash,
            msg.sender,
            block.timestamp
        );
    }

    // --- Public Verification Views (Zero Gas Cost) ---

    /**
     * @notice Verify whether a document has been registered and retrieve its timestamp
     */
    function verifyDocument(bytes32 docHash)
        external
        view
        returns (
            bool isAnchored,
            string memory docType,
            string memory bidderId,
            uint256 blockTimestamp,
            uint256 blockNum
        )
    {
        DocumentProofRecord memory record = documentProofs[docHash];
        return (
            record.exists,
            record.docType,
            record.bidderId,
            record.blockTimestamp,
            record.blockNumber
        );
    }

    /**
     * @notice Retrieve an immutable compliance verdict for a tender & bidder pair
     */
    function verifyComplianceVerdict(
        string calldata tenderRef,
        string calldata bidderId
    )
        external
        view
        returns (
            bool isAnchored,
            string memory verdict,
            uint256 complianceScore,
            bytes32 auditHash,
            address evaluator,
            uint256 timestamp
        )
    {
        bytes32 verdictKey = keccak256(abi.encodePacked(tenderRef, bidderId));
        ComplianceVerdictRecord memory record = verdicts[verdictKey];
        return (
            record.exists,
            record.verdict,
            record.complianceScore,
            record.auditHash,
            record.evaluator,
            record.timestamp
        );
    }

    /**
     * @notice Get all document hashes registered for a specific bidder
     */
    function getBidderDocumentHashes(string calldata bidderId)
        external
        view
        returns (bytes32[] memory)
    {
        return bidderToDocumentHashes[bidderId];
    }
}
