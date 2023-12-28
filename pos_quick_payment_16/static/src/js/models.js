odoo.define('pos_quick_payment_16.models', function (require) {
"use strict";

const { PosGlobalState, Order, Orderline, Payment } = require('point_of_sale.models');
const Registries = require('point_of_sale.Registries');
const { uuidv4 } = require('point_of_sale.utils');
const core = require('web.core');
const Printer = require('point_of_sale.Printer').Printer;
const { batched } = require('point_of_sale.utils')
const QWeb = core.qweb;

const PosQuickOrder = (Order) => class PosQuickOrder extends Order {
        constructor(obj, options) {
            super(...arguments);
            this.is_quick_payment = false;
            this.is_credit_payment = false;
            this.payment_due = 0;
        }
        set_is_quick_payment(value){
            this.is_quick_payment = value;
            // this trigger also triggers the change event of the collection.
        }
        set_payment_due(value){
            this.payment_due = value;
            // this trigger also triggers the change event of the collection.
        }
        get_payment_due(){
            return this.payment_due;
            // this trigger also triggers the change event of the collection.
        }
        set_is_credit_payment(value){
            this.is_credit_payment = value;
            // this trigger also triggers the change event of the collection.
        }
    // returns true if this orderline is selected
        is_quick_payment(){
            return this.is_quick_payment;
        }
        is_credit_payment(){
            return this.is_credit_payment;
        }
        export_as_JSON() {
            const json = super.export_as_JSON(...arguments);
            json.is_credit_payment = this.is_credit_payment;
            json.payment_due = this.payment_due;
            return json;
        }

        init_from_JSON(json) {
            super.init_from_JSON(...arguments);
            this.is_credit_payment = json.is_credit_payment;
            this.payment_due = json.payment_due;
        }

    }

   
Registries.Model.extend(Order, PosQuickOrder);
});