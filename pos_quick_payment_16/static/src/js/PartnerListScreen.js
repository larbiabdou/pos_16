/** @odoo-module **/

import NumberBuffer from "point_of_sale.NumberBuffer";
import PartnerListScreen from "point_of_sale.PartnerListScreen";
import Registries from "point_of_sale.Registries";
import session from "web.session";
const { useListener } = require("@web/core/utils/hooks");
var rpc = require("web.rpc");
export const EditPartnerListScreen = (OriginalPartnerListScreen) =>
    class extends OriginalPartnerListScreen {
        setup() {
        super.setup();
        useListener('click-partner-payment', this.ClickPaymentPartner);
        this.state = {
                query: null,
                selectedPartner: this.props.partner,
                detailIsShown: false,
                editModeProps: {
                    partner: null,
                },
                paymentModeProps: {
                    partner: null,
                },
                previousQuery: "",
                currentOffset: 0,
            };
        }
              async partnerCredit(partnerID){
            const result = await rpc.query({
                        model: "res.partner",
                        method: "get_partner_credit",
                        args: [[], {"partner_id":partnerID}],
                    });

            return result;

        }
        async ClickPaymentPartner(partner) {
            var self = this;
            this.state.paymentModeProps.partner = partner;
            const partnerID = this.state.paymentModeProps.partner.detail.id
            const value = await this.partnerCredit(partnerID)
            const { confirmed, payload } = await this.showPopup('PaymentCreditPopup',{
                title: this.env._t('Customer Payment'),
                startingValue: value,
                isInputSelected: true
            });
            if (confirmed) {
                const val = (payload);
            rpc.query({
                        model: "account.payment",
                        method: "create_credit_payment",
                        args: [[], {"partner_id":this.state.paymentModeProps.partner.detail.id, "amount":val}],
                    }).then((response) => {
                        if(response == true)
                        {
                            console.log(response);

                            this.showPopup('SuccessPopup', {
                            title: this.env._t('New Payment created'),
                            body: this.env._t('New payment created'),
                });
                        }
                    });

            }
        }
    }
Registries.Component.extend(PartnerListScreen, EditPartnerListScreen);