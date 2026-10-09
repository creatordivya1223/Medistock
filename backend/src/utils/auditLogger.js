/**
 * MediStock Audit Logger
 * Logs security and resource modification events as structured JSON lines to stdout.
 *
 * @param {Object} options
 * @param {string|import('mongoose').Types.ObjectId} options.userId - User performing the action
 * @param {string} options.action - Audit action identifier
 * @param {string|import('mongoose').Types.ObjectId} [options.targetId] - Target resource ID
 * @param {Object} [options.metadata] - Additional contextual data
 */
const logAudit = ({ userId, action, targetId, metadata = {} }) => {
  const entry = {
    timestamp: new Date().toISOString(),
    type: 'AUDIT',
    userId: userId ? userId.toString() : 'system',
    action,
    targetId: targetId ? targetId.toString() : null,
    ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
  };

  console.log(JSON.stringify(entry));
};

module.exports = {
  logAudit,
};
