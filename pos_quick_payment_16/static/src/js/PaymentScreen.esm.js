/** @odoo-module **/

import NumberBuffer from "point_of_sale.NumberBuffer";
import PaymentScreen from "point_of_sale.PaymentScreen";
import Registries from "point_of_sale.Registries";
import session from "web.session";
var rpc = require("web.rpc");
 const { onMounted, useRef, status } = owl;
export const EditPaymentScreen = (OriginalPaymentScreen) =>
    class extends OriginalPaymentScreen {
        setup() {
        super.setup();
        onMounted(() => {

                    setTimeout(async () => {
                        if (status(this) === "mounted") {
                            if (this.env.pos.get_order().is_quick_payment || this.env.pos.get_order().is_credit_payment){
                                this.validateOrder(true);
                             }
                        }
                    }, 0);
                });
        }
        async validateOrder() {
        let partner = this.currentOrder.get_partner();
                if (!this.currentOrder.is_paid()) {
            if (!partner){
                this.showPopup('ErrorPopup', {
                    title: this.env._t('Incorrect address for shipping'),
                    body: this.env._t('The selected customer needs an address.'),
                });
            }
            else {
                this.env.pos.get_order().is_credit_payment = true;
                this.env.pos.get_order().payment_due = this.env.pos.get_order().get_due();
                console.log(this.env.pos.get_order());
            }

            }
                return super.validateOrder();
            }
        async _isOrderValid() {
               // var has_membership_products = false;
                let partner = this.currentOrder.get_partner();

            if (!this.currentOrder.is_paid()) {
            if (!partner){
                return false;
            }
            else {
             return true;
            }

            }

                return await super._isOrderValid(...arguments);
            }

    }
Registries.Component.extend(PaymentScreen, EditPaymentScreen);