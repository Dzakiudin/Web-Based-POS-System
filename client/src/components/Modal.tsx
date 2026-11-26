import React from 'react';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { VStack } from '@astryxdesign/core/VStack';
import { useMediaQuery } from '@astryxdesign/core/hooks';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    width?: number | string;
    maxWidth?: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, subtitle, children, width = 520 }) => {
    const isMobile = useMediaQuery('(max-width: 768px)');
    if (!isOpen) return null;

    return (
        <Dialog
            isOpen={isOpen}
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
            width={width}
            padding={isMobile ? 3 : 4}
            purpose="form"
            className="pos-modal-dialog"
        >
            <VStack gap={3} style={{ maxHeight: 'calc(90dvh - 36px)', display: 'flex', flexDirection: 'column' }}>
                <DialogHeader
                    title={title}
                    subtitle={subtitle}
                    onOpenChange={(open) => {
                        if (!open) onClose();
                    }}
                    hasDivider
                />
                <div
                    className="pos-modal-scrollable-body"
                    style={{
                        maxHeight: 'calc(85dvh - 90px)',
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        paddingRight: 4,
                        paddingBottom: 10,
                        WebkitOverflowScrolling: 'touch',
                        overscrollBehavior: 'contain',
                    }}
                >
                    <VStack gap={3}>
                        {children}
                    </VStack>
                </div>
            </VStack>
        </Dialog>
    );
};

export default Modal;
