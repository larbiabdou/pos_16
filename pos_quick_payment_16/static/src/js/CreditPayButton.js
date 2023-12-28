odoo.define("pos_quick_payment_16.CreditPayButton", function (require) {
    "use strict";

    const PosComponent = require("point_of_sale.PosComponent");
    const ProductScreen = require("point_of_sale.ProductScreen");
    const {useListener} = require("@web/core/utils/hooks");
    const Registries = require("point_of_sale.Registries");
    const {_lt} = require("web.core");

    class CreditPayButton extends PosComponent {
        setup() {
            super.setup();
            useListener("click", this.onClick);
        }
        async onClick() {

            this.env.pos.get_order().is_quick_payment = false;
            this.env.pos.get_order().is_credit_payment = true;
            if (this.check_partner()){
             if (this.env.pos.get_order().orderlines.some(line => line.get_product().tracking !== 'none' && !line.has_valid_product_lot()) && (this.env.pos.picking_type.use_create_lots || this.env.pos.picking_type.use_existing_lots)) {
                const { confirmed } = await this.showPopup('ConfirmPopup', {
                    title: this.env._t('Some Serial/Lot Numbers are missing'),
                    body: this.env._t('You are trying to sell products with serial/lot numbers, but some of them are not set.\nWould you like to proceed anyway?'),
                    confirmText: this.env._t('Yes'),
                    cancelText: this.env._t('No')
                });
                if (confirmed) {
                    this.create_payment_lines();
                    this.validateOrder(true);
                }
            }
               else {
                       this.create_payment_lines();
                       this.validateOrder(true);
                  }
            }
       }
        check_partner(){
            let partner = this.env.pos.get_order().get_partner();

            if (!partner){
                this.showPopup('ErrorPopup', {
                    title: this.env._t('Incorrect address for shipping'),
                    body: this.env._t('The selected customer needs an address.'),
                });
                return false;
            }
            else {
                if (!partner.allow_credit) {
                this.showPopup('ErrorPopup', {
                    title: this.env._t('Selected Partner'),
                    body: this.env._t('This partner is not allowed to credit'),
                });
                return false;
            }
            else {
            return true;
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

        }
        get currentOrder() {
            return this.env.pos.get_order();
        }
        get paymentLines() {
            return this.currentOrder.get_paymentlines();
        }
        get selectedPaymentLine() {
            return this.currentOrder.selected_paymentline;
        }

        async validateOrder(isForceValidate) {
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
            if(this.env.pos.config.cash_rounding) {
                if(!this.env.pos.get_order().check_paymentlines_rounding()) {
                    this.showPopup('ErrorPopup', {
                        title: this.env._t('Rounding error in payment lines'),
                        body: this.env._t("The amount of your payment lines must be rounded to validate the transaction."),
                    });
                    return;
                }
            }
            if (await this._isOrderValid(isForceValidate)) {
                // remove pending payments before finalizing the validation
                for (let line of this.paymentLines) {
                    if (!line.is_done()) this.currentOrder.remove_paymentline(line);
                }
                await this._finalizeValidation();
            }
        }

                async _finalizeValidation() {
            if ((this.currentOrder.is_paid_with_cash() || this.currentOrder.get_change()) && this.env.pos.config.iface_cashdrawer && this.env.pos.config.use_proxy) {
                this.env.proxy.printer.open_cashbox();
            }

            this.currentOrder.initialize_validation_date();
            this.currentOrder.finalized = true;

            let syncOrderResult, hasError;

            try {
                // 1. Save order to server.
                syncOrderResult = await this.env.pos.push_single_order(this.currentOrder);

                // 2. Invoice.
                if (this.currentOrder.is_to_invoice()) {
                    if (syncOrderResult.length) {
                        await this.env.legacyActionManager.do_action('account.account_invoices', {
                            additional_context: {
                                active_ids: [syncOrderResult[0].account_move],
                            },
                        });
                    } else {
                        throw { code: 401, message: 'Backend Invoice', data: { order: this.currentOrder } };
                    }
                }

                // 3. Post process.
                if (syncOrderResult.length && this.currentOrder.wait_for_push_order()) {
                    const postPushResult = await this._postPushOrderResolve(
                        this.currentOrder,
                        syncOrderResult.map((res) => res.id)
                    );
                    if (!postPushResult) {
                        this.showPopup('ErrorPopup', {
                            title: this.env._t('Error: no internet connection.'),
                            body: this.env._t('Some, if not all, post-processing after syncing order failed.'),
                        });
                    }
                }
            } catch (error) {
                if (error.code == 700 || error.code == 701)
                    this.error = true;

                if ('code' in error) {
                    // We started putting `code` in the rejected object for invoicing error.
                    // We can continue with that convention such that when the error has `code`,
                    // then it is an error when invoicing. Besides, _handlePushOrderError was
                    // introduce to handle invoicing error logic.
                    await this._handlePushOrderError(error);
                } else {
                    // We don't block for connection error. But we rethrow for any other errors.
                    if (isConnectionError(error)) {
                        this.showPopup('OfflineErrorPopup', {
                            title: this.env._t('Connection Error'),
                            body: this.env._t('Order is not synced. Check your internet connection'),
                        });
                    } else {
                        throw error;
                    }
                }
            } finally {
                // Always show the next screen regardless of error since pos has to
                // continue working even offline.
                this.showScreen(this.nextScreen);
                // Remove the order from the local storage so that when we refresh the page, the order
                // won't be there
                this.env.pos.db.remove_unpaid_order(this.currentOrder);

                // Ask the user to sync the remaining unsynced orders.
                if (!hasError && syncOrderResult && this.env.pos.db.get_orders().length) {
                    const { confirmed } = await this.showPopup('ConfirmPopup', {
                        title: this.env._t('Remaining unsynced orders'),
                        body: this.env._t(
                            'There are unsynced orders. Do you want to sync these orders?'
                        ),
                    });
                    if (confirmed) {
                        // NOTE: Not yet sure if this should be awaited or not.
                        // If awaited, some operations like changing screen
                        // might not work.
                        this.env.pos.push_orders();
                    }
                }
            }
        }
    get nextScreen() {
            return !this.error? 'ReceiptScreen' : 'ProductScreen';
        }
    async _isOrderValid(isForceValidate) {
            let partner = this.currentOrder.get_partner();
             if (!this.currentOrder.is_paid()) {
            if (!partner){
                return false;
            }
            else {
             return true;
            }

            }
            if (this.currentOrder.get_orderlines().length === 0 && this.currentOrder.is_to_invoice()) {
                this.showPopup('ErrorPopup', {
                    title: this.env._t('Empty Order'),
                    body: this.env._t(
                        'There must be at least one product in your order before it can be validated and invoiced.'
                    ),
                });
                return false;
            }

            if (this.currentOrder.electronic_payment_in_progress()) {
                this.showPopup('ErrorPopup', {
                    title: this.env._t('Pending Electronic Payments'),
                    body: this.env._t(
                        'There is at least one pending electronic payment.\n' +
                        'Please finish the payment with the terminal or ' +
                        'cancel it then remove the payment line.'
                    ),
                });
                return false;
            }

            const splitPayments = this.paymentLines.filter(payment => payment.payment_method.split_transactions)
            if (splitPayments.length && !this.currentOrder.get_partner()) {
                const paymentMethod = splitPayments[0].payment_method
                const { confirmed } = await this.showPopup('ConfirmPopup', {
                    title: this.env._t('Customer Required'),
                    body: _.str.sprintf(this.env._t('Customer is required for %s payment method.'), paymentMethod.name),
                });
                if (confirmed) {
                    this.selectPartner();
                }
                return false;
            }

            if ((this.currentOrder.is_to_invoice() || this.currentOrder.is_to_ship()) && !this.currentOrder.get_partner()) {
                const { confirmed } = await this.showPopup('ConfirmPopup', {
                    title: this.env._t('Please select the Customer'),
                    body: this.env._t(
                        'You need to select the customer before you can invoice or ship an order.'
                    ),
                });
                if (confirmed) {
                    this.selectPartner();
                }
                return false;
            }

            if (this.currentOrder.is_to_ship() && !(partner.name && partner.street && partner.city && partner.country_id)) {
                this.showPopup('ErrorPopup', {
                    title: this.env._t('Incorrect address for shipping'),
                    body: this.env._t('The selected customer needs an address.'),
                });
                return false;
            }

            if (this.currentOrder.get_total_with_tax() != 0 && this.currentOrder.get_paymentlines().length === 0) {
                this.showNotification(this.env._t('Select a payment method to validate the order.'));
                return false;
            }

            if (!this.currentOrder.is_paid() || this.invoicing) {
                return false;
            }

            if (this.currentOrder.has_not_valid_rounding()) {
                var line = this.currentOrder.has_not_valid_rounding();
                this.showPopup('ErrorPopup', {
                    title: this.env._t('Incorrect rounding'),
                    body: this.env._t(
                        'You have to round your payments lines.' + line.amount + ' is not rounded.'
                    ),
                });
                return false;
            }

            // The exact amount must be paid if there is no cash payment method defined.
            if (
                Math.abs(
                    this.currentOrder.get_total_with_tax() - this.currentOrder.get_total_paid()  + this.currentOrder.get_rounding_applied()
                ) > 0.00001
            ) {
                var cash = false;
                for (var i = 0; i < this.env.pos.payment_methods.length; i++) {
                    cash = cash || this.env.pos.payment_methods[i].is_cash_count;
                }
                if (!cash) {
                    this.showPopup('ErrorPopup', {
                        title: this.env._t('Cannot return change without a cash payment method'),
                        body: this.env._t(
                            'There is no cash payment method available in this point of sale to handle the change.\n\n Please pay the exact amount or add a cash payment method in the point of sale configuration'
                        ),
                    });
                    return false;
                }
            }

            // if the change is too large, it's probably an input error, make the user confirm.
            if (
                !isForceValidate &&
                this.currentOrder.get_total_with_tax() > 0 &&
                this.currentOrder.get_total_with_tax() * 1000 < this.currentOrder.get_total_paid()
            ) {
                this.showPopup('ConfirmPopup', {
                    title: this.env._t('Please Confirm Large Amount'),
                    body:
                        this.env._t('Are you sure that the customer wants to  pay') +
                        ' ' +
                        this.env.pos.format_currency(this.currentOrder.get_total_paid()) +
                        ' ' +
                        this.env._t('for an order of') +
                        ' ' +
                        this.env.pos.format_currency(this.currentOrder.get_total_with_tax()) +
                        ' ' +
                        this.env._t('? Clicking "Confirm" will validate the payment.'),
                }).then(({ confirmed }) => {
                    if (confirmed) this.validateOrder(true);
                });
                return false;
            }

            if (!this.currentOrder._isValidEmptyOrder()) return false;

            return true;
        }
    }
    CreditPayButton.template = "CreditPayButton";

    ProductScreen.addControlButton({
        component: CreditPayButton,
    });

    Registries.Component.add(CreditPayButton);

    return CreditPayButton;
});
