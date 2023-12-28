/** @odoo-module **/

import NumberBuffer from "point_of_sale.NumberBuffer";
import PartnerLine from "point_of_sale.PartnerLine";
import Registries from "point_of_sale.Registries";
import session from "web.session";
const { useListener } = require("@web/core/utils/hooks");
const { useState } = owl;
var rpc = require("web.rpc");
export const EditPartnerLine = (OriginalPartnerLine) =>
    class extends OriginalPartnerLine {
        setup() {
        super.setup();
        this.state = useState({
            partnerCredit : 0
        });
        this.partnerCredit().then((response) => {
            this.state.partnerCredit = response;
        });
        }
        async partnerCredit(){
            const { partner } = this.props;
            var self = this;
            const result = await rpc.query({
                        model: "res.partner",
                        method: "get_partner_credit",
                        args: [[], {"partner_id":partner.id}],
                    });

            return result;

        }
    }
Registries.Component.extend(PartnerLine, EditPartnerLine);


