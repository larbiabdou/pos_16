odoo.define('pos_quick_payment_16.SuccessPopup', function(require) {
    'use strict';

    const AbstractAwaitablePopup = require('point_of_sale.AbstractAwaitablePopup');
    const Registries = require('point_of_sale.Registries');
    const { _lt } = require('@web/core/l10n/translation');

    // formerly SuccessPopupWidget
    class SuccessPopup extends AbstractAwaitablePopup {
        setup() {
            super.setup();
        }
    }
    SuccessPopup.template = 'SuccessPopup';
    SuccessPopup.defaultProps = {
        confirmText: _lt('Ok'),
        title: _lt('Error'),
        body: '',
        cancelKey: false,
    };

    Registries.Component.add(SuccessPopup);

    return SuccessPopup;
});
