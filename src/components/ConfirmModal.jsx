import { FaExclamationTriangle } from "react-icons/fa";

function ConfirmModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Confirm",
  confirmType = "danger",
}) {
  if (!isOpen) return null;

  return (
    <div className="edit-overlay" onClick={onCancel}>
      <div
        className="edit-modal confirm-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="confirm-modal-header">
          <FaExclamationTriangle className="confirm-icon" />
          <h2>{title || "Confirm Action"}</h2>
        </div>

        <p className="confirm-modal-message">
          {message || "Are you sure you want to proceed?"}
        </p>

        <div className="edit-buttons">
          <button type="button" className="cancel-btn" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className={
              confirmType === "danger"
                ? "delete-btn confirm-btn-delete"
                : "update-btn"
            }
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;
