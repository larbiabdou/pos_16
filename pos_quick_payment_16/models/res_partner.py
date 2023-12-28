# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from collections import defaultdict
from datetime import timedelta

from odoo import api, fields, models, _
from odoo.tools import float_round
from odoo.exceptions import AccessError, UserError, ValidationError
from odoo.tools import float_is_zero
import logging

_logger = logging.getLogger(__name__)


class ResPartner(models.Model):
    _inherit = 'res.partner'

    allow_credit = fields.Boolean(string='Allow credit')

    pos_partner_credit = fields.Float(
        string='Solde',
        compute="compute_pos_partner_credit",
        digits='Product Price',
        required=False)

    def get_partner_credit(self, data):
        partner = self.env['res.partner'].search([('id', '=', data['partner_id'])])
        return partner.pos_partner_credit

    def compute_pos_partner_credit(self):
        for partner in self:
            partner.pos_partner_credit = 0
            invoices = self.env['account.move'].search([('state', '=', 'posted'),('is_pos_credit', '=', True), ('partner_id', '=', partner.id)])
            payments = self.env['account.payment'].search([('state', '=', 'posted'),('is_pos_payment', '=', True), ('partner_id', '=', partner.id)])
            partner.pos_partner_credit = float_round(sum(invoice.amount_total_signed for invoice in invoices) - sum(payment.amount for payment in payments), 0)