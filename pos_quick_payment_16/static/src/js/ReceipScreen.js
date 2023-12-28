/** @odoo-module **/

import NumberBuffer from "point_of_sale.NumberBuffer";
import ReceiptScreen from "point_of_sale.ReceiptScreen";
import Registries from "point_of_sale.Registries";
import session from "web.session";
 const { onMounted, useRef, status } = owl;
export const EditReceiptScreen = (OriginalReceiptScreen) =>
    class extends OriginalReceiptScreen {
    setup() {
        super.setup();
        onMounted(() => {
                    // Here, we send a task to the event loop that handles
                    // the printing of the receipt when the component is mounted.
                    // We are doing this because we want the receipt screen to be
                    // displayed regardless of what happen to the handleAutoPrint
                    // call.
                    setTimeout(async () => {
                        if (status(this) === "mounted") {
                            let images = this.orderReceipt.el.getElementsByTagName('img');
                            for (let image of images) {
                                await image.decode();
                            }
                            await this.handleAutoPrint();
                        }
                    }, 0);
                    if (this.env.pos.get_order().is_quick_payment || this.env.pos.get_order().is_credit_payment){
                                //console.log('under payment');
                                //this.validateOrder(true);
                                this.orderDone();
                             }
                });
                }
    }
Registries.Component.extend(ReceiptScreen, EditReceiptScreen);