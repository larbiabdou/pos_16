# -*- coding: utf-8 -*-

from odoo import api, fields, models, _
import logging

_logger = logging.getLogger(__name__)


class AccountPayment(models.Model):
    _inherit = 'account.payment'
    
    is_pos_payment = fields.Boolean(
        string='Is_pos_payment', 
        required=False)

    def create_credit_payment(self, data):
        journal_id = self.env['account.journal'].search([('type', '=', 'cash')], limit=1)
        if journal_id:
            payment = self.env['account.payment'].create({
                'amount': data['amount'],
                'payment_type': 'inbound',
                'partner_type': 'customer',
                'journal_id': journal_id.id,
                'partner_id': data['partner_id'],
                'is_pos_payment': True,
            })
            payment.action_post()
        return True
