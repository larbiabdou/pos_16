/** @odoo-module **/

import NumberBuffer from "point_of_sale.NumberBuffer";
import ProductScreen from "point_of_sale.ProductScreen";
import PaymentScreen from "point_of_sale.PaymentScreen";
import Registries from "point_of_sale.Registries";
import session from "web.session";
const { useListener } = require("@web/core/utils/hooks");
export const EditProductScreen = (OriginalProductScreen) =>
    class extends OriginalProductScreen {
        setup() {
        super.setup();
        useListener('click-quick-pay', this._onClickQuickPay);
        useListener('click-credit-pay', this._onClickCreditPay);
        }
        async _onClickPay() {
        this.env.pos.get_order().is_quick_payment = false;
        this.env.pos.get_order().is_credit_payment = false;
                    const payment_method_cash = this.env.pos.payment_methods.filter(method => this.env.pos.config.payment_method_ids.includes(method.id) && method.type === 'cash');

            var line = this.env.pos.get_order().add_paymentline(payment_method_cash[0]);
             super._onClickPay(...arguments);
        }
        async _onClickQuickPay() {
            const payment_method_cash = this.env.pos.payment_methods.filter(method => this.env.pos.config.payment_method_ids.includes(method.id) && method.type === 'cash');

            this.env.pos.get_order().is_quick_payment = true;
            this.env.pos.get_order().is_credit_payment = false;
            if (this.env.pos.get_order().orderlines.some(line => line.get_product().tracking !== 'none' && !line.has_valid_product_lot()) && (this.env.pos.picking_type.use_create_lots || this.env.pos.picking_type.use_existing_lots)) {
                const { confirmed } = await this.showPopup('ConfirmPopup', {
                    title: this.env._t('Some Serial/Lot Numbers are missing'),
                    body: this.env._t('You are trying to sell products with serial/lot numbers, but some of them are not set.\nWould you like to proceed anyway?'),
                    confirmText: this.env._t('Yes'),
                    cancelText: this.env._t('No')
                });
                if (confirmed) {
                    this.create_payment_lines();
                }
            } else {
                this.create_payment_lines();
            }
        }
        async _onClickCreditPay() {

            this.env.pos.get_order().is_quick_payment = false;
            this.env.pos.get_order().is_credit_payment = true;
            let partner = this.currentOrder.get_partner();
            if (!partner){
                this.showPopup('ErrorPopup', {
                    title: this.env._t('Incorrect address for shipping'),
                    body: this.env._t('The selected customer needs an address.'),
                });

            }
            else {
            if (this.env.pos.get_order().orderlines.some(line => line.get_product().tracking !== 'none' && !line.has_valid_product_lot()) && (this.env.pos.picking_type.use_create_lots || this.env.pos.picking_type.use_existing_lots)) {
                const { confirmed } = await this.showPopup('ConfirmPopup', {
                    title: this.env._t('Some Serial/Lot Numbers are missing'),
                    body: this.env._t('You are trying to sell products with serial/lot numbers, but some of them are not set.\nWould you like to proceed anyway?'),
                    confirmText: this.env._t('Yes'),
                    cancelText: this.env._t('No')
                });
                if (confirmed) {

                }
            }
               else {
                       this.create_payment_lines();
                  }
            }
        }
        create_payment_lines(){
            const payment_method_cash = this.env.pos.payment_methods.filter(method => this.env.pos.config.payment_method_ids.includes(method.id) && method.type === 'cash');

            var lines = this.env.pos.get_order().get_paymentlines();
                 for ( let line of lines)
                {
                    line.amount = 0;
                }
                this.env.pos.get_order().clean_empty_paymentlines();
                var line = this.env.pos.get_order().add_paymentline(payment_method_cash[0]);
                if (this.env.pos.get_order().is_credit_payment){
                    line.amount = 0;
                }
                this.showScreen('PaymentScreen');

        }

    }
Registries.Component.extend(ProductScreen, EditProductScreen);