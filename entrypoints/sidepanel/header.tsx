import React from "react";
import { useTranslation } from "react-i18next";

export default (props: { headTitle: string }) => {
    console.log('Header component rendering with title:', props.headTitle);
    const { t } = useTranslation();
    
    // Map heading titles to translated strings
    const getTitle = () => {
        switch (props.headTitle.toLowerCase()) {
            case 'home':
                return t('common:home');
            case 'collections':
                return t('common:collections');
            case 'components':
                return t('common:components');
            case 'settings':
                return t('common:settings');
            default:
                return props.headTitle;
        }
    };
    
    return (
        <div className="flex h-[49px] w-full justify-between px-6 py-3 border-b items-center">
            <h1 className="text-lg font-medium">
                {getTitle()}
            </h1>
        </div>
    );
};

