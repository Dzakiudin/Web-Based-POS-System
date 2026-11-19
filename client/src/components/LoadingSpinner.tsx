import { Center } from '@astryxdesign/core/Center';
import { Spinner } from '@astryxdesign/core/Spinner';

const LoadingSpinner = () => {
    return (
        <Center minHeight="40vh" width="100%">
            <Spinner size="lg" label="Memuat..." />
        </Center>
    );
};

export default LoadingSpinner;
