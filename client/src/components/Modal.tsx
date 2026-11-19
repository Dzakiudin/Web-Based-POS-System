import React from 'react';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { VStack } from '@astryxdesign/core/VStack';

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
    return (
        <Dialog
            isOpen={isOpen}
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
            width={width}
            padding={4}
            purpose="form"
        >
            <VStack gap={4}>
                <DialogHeader
                    title={title}
                    subtitle={subtitle}
                    onOpenChange={(open) => {
                        if (!open) onClose();
                    }}
                    hasDivider
                />
                <VStack gap={3}>
                    {children}
                </VStack>
            </VStack>
        </Dialog>
    );
};

export default Modal;
