import FullReturnModal from './orders/FullReturnModal';
import PartialReturnModal from './orders/PartialReturnModal';
import CancelOrderModal from './orders/CancelOrderModal';
import type { SharedModalState } from '../pages/orders/OrdersPage';

interface ReturnModalsProps {
  modalState: SharedModalState;
  setModalState: React.Dispatch<React.SetStateAction<SharedModalState>>;
}

export default function ReturnModals({ modalState, setModalState }: ReturnModalsProps) {
  const handleSuccess = () => {
    setModalState((prev) => ({
      ...prev,
      showFullReturnModal: false,
      showPartialReturnModal: false,
      showCancelOrderModal: false,
      selectedOrder: null,
    }));
  };

  return (
    <>
      <FullReturnModal
        open={modalState.showFullReturnModal}
        onOpenChange={(open) => setModalState((prev) => ({ ...prev, showFullReturnModal: open }))}
        selectedOrder={modalState.selectedOrder}
        onSuccess={handleSuccess}
      />

      <PartialReturnModal
        open={modalState.showPartialReturnModal}
        onOpenChange={(open) => setModalState((prev) => ({ ...prev, showPartialReturnModal: open }))}
        selectedOrder={modalState.selectedOrder}
        onSuccess={handleSuccess}
      />

      <CancelOrderModal
        open={modalState.showCancelOrderModal}
        onOpenChange={(open) => setModalState((prev) => ({ ...prev, showCancelOrderModal: open }))}
        selectedOrder={modalState.selectedOrder}
        onSuccess={handleSuccess}
      />
    </>
  );
}
