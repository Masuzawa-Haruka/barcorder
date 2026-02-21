declare module 'react-mobile-picker' {
    import { ReactNode } from 'react';

    type PickerValue = Record<string, string>;

    interface PickerProps {
        value: PickerValue;
        onChange: (value: PickerValue) => void;
        wheelMode?: 'normal' | 'natural';
        height?: number;
        children: ReactNode;
    }

    interface PickerColumnProps {
        name: string;
        children: ReactNode;
    }

    interface PickerItemProps {
        value: string;
        children: (props: { selected: boolean }) => ReactNode;
    }

    interface PickerComponent extends React.FC<PickerProps> {
        Column: React.FC<PickerColumnProps>;
        Item: React.FC<PickerItemProps>;
    }

    const Picker: PickerComponent;
    export default Picker;
}
