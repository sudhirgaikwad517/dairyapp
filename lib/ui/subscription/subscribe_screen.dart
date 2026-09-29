import 'dart:async';

import 'package:dairy_app/framework/controller/subscription/subscription_controller.dart';
import 'package:dairy_app/framework/controller/base/base_controller.dart';
import 'package:dairy_app/framework/controller/wallet/wallet_controller.dart';
import 'package:dairy_app/framework/dependency_injection/inject.dart';
import 'package:dairy_app/framework/provider/auth_provider.dart';
import 'package:dairy_app/framework/provider/payment/razorpay_service.dart';
import 'package:dairy_app/framework/repository/cart/product_model.dart';
import 'package:dairy_app/framework/repository/checkout/checkout_models.dart';
import 'package:dairy_app/framework/repository/checkout/checkout_repository.dart';
import 'package:dairy_app/framework/repository/cutoff/cutoff_repository.dart';
import 'package:dairy_app/framework/repository/payment/payment_repository.dart';
import 'package:dairy_app/framework/repository/subscription/subscription_repository.dart';
import 'package:dairy_app/ui/utils/app_constants/app_constants.dart';
import 'package:dairy_app/ui/utils/theme/app_colors.dart';
import 'package:dairy_app/ui/utils/theme/text_styles.dart';
import 'package:dairy_app/ui/utils/widgets/common_container.dart';
import 'package:dairy_app/ui/utils/widgets/common_icon.dart';
import 'package:dairy_app/ui/utils/widgets/common_text.dart';
import 'package:dairy_app/ui/wallet/wallet_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

const _kPaymentWallet = 'wallet';
const _kPaymentOnline = 'online';

const _kEveryDay = 'daily';
const _kAlternateDay = 'alternate_days';
const _kEvery3Days = 'every_3_days';
const _kDayWise = 'day_wise';

const List<_FrequencyOption> _kFrequencyOptions = [
  _FrequencyOption(_kEveryDay, 'Every day'),
  _FrequencyOption(_kAlternateDay, 'Alternate day'),
  _FrequencyOption(_kEvery3Days, 'Every 3 day'),
  _FrequencyOption(_kDayWise, 'Day wise'),
];

const List<_Weekday> _kWeekdays = [
  _Weekday(1, 'Mon'),
  _Weekday(2, 'Tue'),
  _Weekday(3, 'Wed'),
  _Weekday(4, 'Thu'),
  _Weekday(5, 'Fri'),
  _Weekday(6, 'Sat'),
  _Weekday(7, 'Sun'),
];

class _FrequencyOption {
  final String value;
  final String label;
  const _FrequencyOption(this.value, this.label);
}

class _Weekday {
  final int iso;
  final String label;
  const _Weekday(this.iso, this.label);
}

/// Set up a recurring subscription for one product — reached from the
/// product detail screen's "Subscribe" action (until now only "Buy Once" /
/// "Add to Cart" existed there).
class SubscribeScreen extends ConsumerStatefulWidget {
  const SubscribeScreen({
    super.key,
    required this.product,
    this.initialQuantity = 1,
    this.initialDeliverySlotId,
  });

  final ProductModel product;

  /// Carries over the quantity / delivery-shift choice a customer already
  /// made in the "Add to Cart" sheet, so switching to Subscribe there doesn't
  /// throw those picks away.
  final int initialQuantity;
  final String? initialDeliverySlotId;

  @override
  ConsumerState<SubscribeScreen> createState() => _SubscribeScreenState();
}

class _SubscribeScreenState extends ConsumerState<SubscribeScreen> {
  late int _quantity = widget.initialQuantity;
  String _frequency = _kEveryDay;
  final Set<int> _dayWiseDays = {};
  late String? _deliverySlotId = widget.initialDeliverySlotId;
  late DateTime _fromDate;
  DateTime? _toDate;

  bool _loadingOptions = true;
  List<DeliverySlotModel> _slots = const [];
  CutoffInfo _cutoff = CutoffInfo.fallback();
  String? _error;

  bool _onlinePaymentAvailable = false;
  String _paymentMethod = _kPaymentWallet;
  SubscriptionQuote? _quote;
  bool _quoteLoading = false;
  String? _quoteError;
  Timer? _quoteDebounce;
  int _quoteRequestId = 0;

  /// A prepaid customer pays the whole plan upfront (so we need a known
  /// number of deliveries to charge for); postpaid is billed per delivery as
  /// it happens, so an open-ended plan and no payment step are both fine.
  bool get _isPrepaid => (ref.read(authNotifierProvider).customer?['customerType']?.toString() ?? 'prepaid') == 'prepaid';

  @override
  void initState() {
    super.initState();
    _fromDate = DateTime.now();
    Future.microtask(_loadOptions);
    Future.microtask(() => ref.read(walletProvider).loadWallet());
  }

  @override
  void dispose() {
    _quoteDebounce?.cancel();
    super.dispose();
  }

  Future<void> _loadOptions() async {
    final results = await Future.wait([
      getIt<CheckoutRepository>().deliverySlots(),
      getIt<CutoffRepository>().fetchCutoffInfo(),
      getIt<PaymentRepository>().isOnlinePaymentAvailable(),
    ]);
    if (!mounted) return;
    setState(() {
      _slots = results[0] as List<DeliverySlotModel>;
      _cutoff = results[1] as CutoffInfo;
      _onlinePaymentAvailable = results[2] as bool;
      _fromDate = _cutoff.earliestEffectiveDate;
      if (_deliverySlotId == null && _slots.isNotEmpty) _deliverySlotId = _slots.first.id;
      _loadingOptions = false;
      if (!_onlinePaymentAvailable) _paymentMethod = _kPaymentWallet;
    });
    _refreshQuote();
  }

  /// Debounced so rapid taps (qty +/-, weekday toggles) don't fire a request
  /// per tap — only prepaid needs this at all, postpaid's total is always 0.
  void _refreshQuote() {
    if (!_isPrepaid) return;
    _quoteDebounce?.cancel();
    _quoteDebounce = Timer(const Duration(milliseconds: 350), _fetchQuote);
  }

  Future<void> _fetchQuote() async {
    if (_frequency == _kDayWise && _dayWiseDays.isEmpty) return;
    final requestId = ++_quoteRequestId;
    setState(() {
      _quoteLoading = true;
      _quoteError = null;
    });

    final result = await ref.read(subscriptionProvider).quote(
          productId: widget.product.id,
          frequency: _frequency,
          dayWiseDays: _frequency == _kDayWise ? _dayWiseDays.toList() : null,
          quantity: _quantity,
          startDate: _isoDate(_fromDate),
          toDate: _toDate == null ? null : _isoDate(_toDate!),
        );

    if (!mounted || requestId != _quoteRequestId) return; // a newer request already superseded this one
    setState(() {
      _quoteLoading = false;
      if (result.isSuccess) {
        _quote = result.quote;
        if (result.quote!.walletSufficient == false && _paymentMethod == _kPaymentWallet && _onlinePaymentAvailable) {
          _paymentMethod = _kPaymentOnline;
        }
      } else {
        _quote = null;
        _quoteError = result.error;
      }
    });
  }

  Future<void> _pickFromDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _fromDate,
      firstDate: _cutoff.earliestEffectiveDate,
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (picked == null) return;
    setState(() {
      _fromDate = picked;
      if (_toDate != null && _toDate!.isBefore(_fromDate)) _toDate = null;
    });
    _refreshQuote();
  }

  Future<void> _pickToDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _toDate ?? _fromDate.add(const Duration(days: 30)),
      firstDate: _fromDate,
      lastDate: DateTime.now().add(const Duration(days: 730)),
    );
    if (picked != null) setState(() => _toDate = picked);
    _refreshQuote();
  }

  String _isoDate(DateTime date) =>
      '${date.year.toString().padLeft(4, '0')}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';

  bool get _needsPayment => _isPrepaid && (_quote?.totalCost ?? 0) > 0;

  String get _submitLabel {
    if (!_needsPayment) return 'Subscribe Now';
    final total = _quote!.totalCost.toStringAsFixed(0);
    return _paymentMethod == _kPaymentOnline
        ? 'Pay ${AppConstants.currency}$total Online'
        : 'Pay ${AppConstants.currency}$total & Subscribe';
  }

  Future<void> _submit() async {
    if (_frequency == _kDayWise && _dayWiseDays.isEmpty) {
      setState(() => _error = 'Choose at least one day for a Day wise plan.');
      return;
    }
    if (_isPrepaid && _toDate == null) {
      setState(() => _error = 'Choose an end date — a prepaid plan is paid upfront for a fixed period.');
      return;
    }
    if (_isPrepaid && (_quote == null || _quoteLoading)) {
      setState(() => _error = 'Still calculating your plan total — try again in a moment.');
      return;
    }
    setState(() => _error = null);

    if (_needsPayment && _paymentMethod == _kPaymentOnline) {
      await _submitWithOnlinePayment();
    } else {
      await _submitCreate(
        paymentMethod: _needsPayment ? _kPaymentWallet : null,
      );
    }
  }

  Future<void> _submitWithOnlinePayment() async {
    final orderResult = await getIt<PaymentRepository>().createOrderForSubscription(
      productId: widget.product.id,
      frequency: _frequency,
      dayWiseDays: _frequency == _kDayWise ? _dayWiseDays.toList() : null,
      quantity: _quantity,
      startDate: _isoDate(_fromDate),
      toDate: _isoDate(_toDate!),
    );
    if (!orderResult.isSuccess) {
      if (!mounted) return;
      setState(() => _error = orderResult.error ?? 'Unable to start payment');
      return;
    }

    final checkout = RazorpayCheckout();
    final customer = ref.read(authNotifierProvider).customer;
    RazorpaySuccess payment;
    try {
      payment = await checkout.open(
        order: orderResult.data!,
        customerName: (customer?['name'] as String?)?.trim().isNotEmpty == true ? customer!['name'] as String : 'Customer',
        phone: customer?['phone']?.toString() ?? '',
        email: customer?['email']?.toString(),
        description: 'Subscription: ${widget.product.name}',
      );
    } on RazorpayFailure catch (failure) {
      if (!mounted) return;
      setState(() => _error = failure.message);
      return;
    } finally {
      checkout.dispose();
    }

    await _submitCreate(
      paymentMethod: _kPaymentOnline,
      razorpayOrderId: payment.orderId,
      razorpayPaymentId: payment.paymentId,
      razorpaySignature: payment.signature,
    );
  }

  Future<void> _submitCreate({
    String? paymentMethod,
    String? razorpayOrderId,
    String? razorpayPaymentId,
    String? razorpaySignature,
  }) async {
    final failure = await ref.read(subscriptionProvider).create(
          productId: widget.product.id,
          frequency: _frequency,
          dayWiseDays: _frequency == _kDayWise ? _dayWiseDays.toList() : null,
          quantity: _quantity,
          deliverySlotId: _deliverySlotId,
          startDate: _isoDate(_fromDate),
          toDate: _toDate == null ? null : _isoDate(_toDate!),
          paymentMethod: paymentMethod,
          razorpayOrderId: razorpayOrderId,
          razorpayPaymentId: razorpayPaymentId,
          razorpaySignature: razorpaySignature,
        );

    if (!mounted) return;

    if (failure != null) {
      setState(() => _error = failure);
      return;
    }

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('${widget.product.name} subscribed successfully'),
        backgroundColor: AppColors.clr34C759,
      ),
    );
    // "Subscription" is a bottom-nav tab with no Scaffold of its own — switch
    // the shell to it and unwind back rather than pushing it as a route.
    ref.read(baseProvider).selectTabByTitle('Subscription');
    Navigator.of(context).popUntil((route) => route.isFirst);
  }

  @override
  Widget build(BuildContext context) {
    final wallet = ref.watch(walletProvider);
    final subscriptionState = ref.watch(subscriptionProvider);

    return Scaffold(
      backgroundColor: AppColors.clrF7F7F7,
      body: SafeArea(
        child: Column(
          children: [
            _buildHeader(context, wallet),
            Expanded(
              child: _loadingOptions
                  ? const Center(child: CircularProgressIndicator())
                  : SingleChildScrollView(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Padding(
                            padding: const EdgeInsets.all(16),
                            child: _buildProductRow(),
                          ),
                          if (_slots.isNotEmpty) ...[
                            _sectionHeader('Delivery Shift'),
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 16),
                              child: _buildSlotChips(),
                            ),
                          ],
                          _sectionHeader('Delivery Schedule'),
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            child: _buildFrequencyChips(),
                          ),
                          if (_frequency == _kDayWise)
                            Padding(
                              padding: const EdgeInsets.fromLTRB(16, 14, 16, 0),
                              child: _buildDayWisePicker(),
                            ),
                          _sectionHeader('Choose Date'),
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            child: _buildDateRow(),
                          ),
                          if (_isPrepaid) ...[
                            _sectionHeader('Plan Total'),
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 16),
                              child: _buildPlanTotalCard(wallet),
                            ),
                          ] else
                            Padding(
                              padding: const EdgeInsets.fromLTRB(16, 20, 16, 0),
                              child: _buildPostpaidBanner(),
                            ),
                          if (_error != null)
                            Padding(
                              padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
                              child: CommonText(
                                data: _error!,
                                style: TextStyles.medium.copyWith(fontSize: 12, color: AppColors.clrRedD32F2F),
                              ),
                            ),
                          const SizedBox(height: 100),
                        ],
                      ),
                    ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: _loadingOptions
          ? null
          : SafeArea(
              minimum: const EdgeInsets.fromLTRB(16, 10, 16, 12),
              child: SizedBox(
                height: 54,
                child: FilledButton(
                  onPressed: subscriptionState.isUpdating ? null : _submit,
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.clr101828,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  child: Text(
                    subscriptionState.isUpdating ? 'Please wait...' : _submitLabel,
                    style: TextStyles.bold.copyWith(fontSize: 16, color: AppColors.clrWhiteFFFFFF),
                  ),
                ),
              ),
            ),
    );
  }

  Widget _buildHeader(BuildContext context, WalletController wallet) {
    return CommonContainer(
      color: AppColors.clrWhiteFFFFFF,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          GestureDetector(
            onTap: () => Navigator.maybePop(context),
            child: const CommonIcon(icon: Icons.arrow_back_ios_new_rounded, size: 20, color: AppColors.clr101828),
          ),
          const SizedBox(width: 12),
          CommonText(
            data: "Subscription",
            style: TextStyles.bold.copyWith(fontSize: 18, color: AppColors.clr101828),
          ),
          const Spacer(),
          GestureDetector(
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const WalletScreen())),
            child: CommonContainer(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              borderRadius: BorderRadius.circular(20),
              color: AppColors.clr101828,
              child: Row(
                children: [
                  const CommonIcon(icon: Icons.account_balance_wallet_outlined, size: 15, color: AppColors.clrWhiteFFFFFF),
                  const SizedBox(width: 6),
                  CommonText(
                    data: "${AppConstants.currency}${wallet.balance.toStringAsFixed(0)}",
                    style: TextStyles.bold.copyWith(fontSize: 12, color: AppColors.clrWhiteFFFFFF),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _sectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 12),
      child: CommonText(
        data: title,
        style: TextStyles.bold.copyWith(fontSize: 15, color: AppColors.clr101828),
      ),
    );
  }

  Widget _buildProductRow() {
    final product = widget.product;
    return CommonContainer(
      padding: const EdgeInsets.all(14),
      borderRadius: BorderRadius.circular(16),
      color: AppColors.clrWhiteFFFFFF,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: SizedBox(
              height: 72,
              width: 72,
              child: (product.image == null || product.image!.isEmpty)
                  ? const ColoredBox(
                      color: AppColors.clrD7D7FF,
                      child: CommonIcon(icon: Icons.local_drink, size: 30, color: AppColors.clr6156F1),
                    )
                  : Image.network(
                      product.image!,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => const ColoredBox(
                        color: AppColors.clrD7D7FF,
                        child: CommonIcon(icon: Icons.local_drink, size: 30, color: AppColors.clr6156F1),
                      ),
                    ),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CommonText(
                  data: product.name,
                  style: TextStyles.bold.copyWith(fontSize: 15, color: AppColors.clr101828),
                  maxLines: 2,
                ),
                const SizedBox(height: 3),
                CommonText(
                  data: product.volume,
                  style: TextStyles.regular.copyWith(fontSize: 13, color: AppColors.clrGrey757575),
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    CommonText(
                      data: "${AppConstants.currency}${product.subscriptionPrice.toStringAsFixed(0)}",
                      style: TextStyles.bold.copyWith(fontSize: 16, color: AppColors.clr101828),
                    ),
                    if (product.hasMrp) ...[
                      const SizedBox(width: 6),
                      CommonText(
                        data: "${AppConstants.currency}${product.mrp.toStringAsFixed(0)}",
                        style: TextStyles.regular.copyWith(
                          fontSize: 12,
                          color: AppColors.clrGrey757575,
                          decoration: TextDecoration.lineThrough,
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          _buildQuantityStepper(),
        ],
      ),
    );
  }

  Widget _buildQuantityStepper() {
    return CommonContainer(
      padding: const EdgeInsets.symmetric(horizontal: 4),
      borderRadius: BorderRadius.circular(24),
      border: Border.all(color: AppColors.grayEAECF0),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          IconButton(
            onPressed: _quantity > 1
                ? () {
                    setState(() => _quantity--);
                    _refreshQuote();
                  }
                : null,
            icon: const CommonIcon(icon: Icons.remove_rounded, size: 18, color: AppColors.clr101828),
            visualDensity: VisualDensity.compact,
          ),
          CommonText(data: '$_quantity', style: TextStyles.bold.copyWith(fontSize: 15, color: AppColors.clr101828)),
          IconButton(
            onPressed: () {
              setState(() => _quantity++);
              _refreshQuote();
            },
            icon: const CommonIcon(icon: Icons.add_rounded, size: 18, color: AppColors.clr101828),
            visualDensity: VisualDensity.compact,
          ),
        ],
      ),
    );
  }

  Widget _buildSlotChips() {
    return Wrap(
      spacing: 10,
      runSpacing: 10,
      children: _slots.map((slot) {
        final selected = _deliverySlotId == slot.id;
        return _Chip(
          label: slot.label,
          selected: selected,
          onTap: () => setState(() => _deliverySlotId = slot.id),
        );
      }).toList(),
    );
  }

  Widget _buildFrequencyChips() {
    return Wrap(
      spacing: 10,
      runSpacing: 10,
      children: _kFrequencyOptions.map((option) {
        final selected = _frequency == option.value;
        return _Chip(
          label: option.label,
          selected: selected,
          onTap: () {
            setState(() => _frequency = option.value);
            _refreshQuote();
          },
        );
      }).toList(),
    );
  }

  Widget _buildDayWisePicker() {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: _kWeekdays.map((day) {
        final selected = _dayWiseDays.contains(day.iso);
        return _Chip(
          label: day.label,
          selected: selected,
          compact: true,
          onTap: () {
            setState(() {
              if (selected) {
                _dayWiseDays.remove(day.iso);
              } else {
                _dayWiseDays.add(day.iso);
              }
            });
            _refreshQuote();
          },
        );
      }).toList(),
    );
  }

  Widget _buildDateRow() {
    return Row(
      children: [
        Expanded(child: _dateField('From Date', _fromDate, _pickFromDate)),
        const SizedBox(width: 12),
        Expanded(child: _dateField(_isPrepaid ? 'To Date (required)' : 'To Date (optional)', _toDate, _pickToDate, placeholder: true)),
      ],
    );
  }

  Widget _dateField(String hint, DateTime? value, VoidCallback onTap, {bool placeholder = false}) {
    return GestureDetector(
      onTap: onTap,
      child: CommonContainer(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        borderRadius: BorderRadius.circular(12),
        color: AppColors.clrWhiteFFFFFF,
        border: Border.all(color: AppColors.grayEAECF0),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            CommonText(
              data: value != null ? DateFormat('dd/MM/yyyy').format(value) : hint,
              style: TextStyles.medium.copyWith(
                fontSize: 14,
                color: value != null ? AppColors.clr101828 : AppColors.clrGrey757575,
              ),
            ),
            const CommonIcon(icon: Icons.calendar_month_outlined, size: 18, color: AppColors.clrGrey757575),
          ],
        ),
      ),
    );
  }

  Widget _buildPlanTotalCard(WalletController wallet) {
    if (_quoteLoading && _quote == null) {
      return const CommonContainer(
        padding: EdgeInsets.all(16),
        borderRadius: BorderRadius.all(Radius.circular(14)),
        color: AppColors.clrWhiteFFFFFF,
        alignment: Alignment.center,
        child: SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2)),
      );
    }

    if (_quoteError != null) {
      return CommonContainer(
        padding: const EdgeInsets.all(16),
        borderRadius: BorderRadius.circular(14),
        color: AppColors.clrWhiteFFFFFF,
        child: CommonText(
          data: _quoteError!,
          style: TextStyles.medium.copyWith(fontSize: 13, color: AppColors.clrRedD32F2F),
        ),
      );
    }

    final quote = _quote;
    if (quote == null) {
      return CommonContainer(
        padding: const EdgeInsets.all(16),
        borderRadius: BorderRadius.circular(14),
        color: AppColors.clrWhiteFFFFFF,
        child: CommonText(
          data: _toDate == null
              ? 'Pick an end date above to see your plan total.'
              : 'Calculating…',
          style: TextStyles.regular.copyWith(fontSize: 13, color: AppColors.clrGrey757575),
        ),
      );
    }

    if (quote.totalCost <= 0) {
      // A free plan (e.g. a 0-rate product) needs no payment even though the
      // customer is prepaid.
      return CommonContainer(
        padding: const EdgeInsets.all(16),
        borderRadius: BorderRadius.circular(14),
        color: AppColors.clrWhiteFFFFFF,
        child: CommonText(
          data: 'Nothing to pay for this plan.',
          style: TextStyles.medium.copyWith(fontSize: 13, color: AppColors.clr101828),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        CommonContainer(
          padding: const EdgeInsets.all(16),
          borderRadius: BorderRadius.circular(14),
          color: AppColors.clrWhiteFFFFFF,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  CommonText(
                    data: '${quote.occurrences} deliveries × ${AppConstants.currency}${quote.rate.toStringAsFixed(0)} × ${quote.quantity}',
                    style: TextStyles.regular.copyWith(fontSize: 12, color: AppColors.clrGrey757575),
                  ),
                  const SizedBox(height: 4),
                  CommonText(
                    data: 'Pay upfront for this plan',
                    style: TextStyles.bold.copyWith(fontSize: 13, color: AppColors.clr101828),
                  ),
                ],
              ),
              CommonText(
                data: '${AppConstants.currency}${quote.totalCost.toStringAsFixed(0)}',
                style: TextStyles.bold.copyWith(fontSize: 20, color: AppColors.clr101828),
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),
        _paymentTile(
          method: _kPaymentWallet,
          icon: Icons.account_balance_wallet_outlined,
          title: 'Pay from Wallet',
          subtitle: quote.walletSufficient
              ? 'Balance ${AppConstants.currency}${quote.walletBalance.toStringAsFixed(0)}'
              : 'Balance ${AppConstants.currency}${quote.walletBalance.toStringAsFixed(0)} — not enough for this plan',
          enabled: quote.walletSufficient,
        ),
        if (_onlinePaymentAvailable) ...[
          const SizedBox(height: 10),
          _paymentTile(
            method: _kPaymentOnline,
            icon: Icons.credit_card_rounded,
            title: 'Pay Online',
            subtitle: 'UPI, cards, net banking & wallets via Razorpay',
            enabled: true,
          ),
        ],
      ],
    );
  }

  Widget _paymentTile({
    required String method,
    required IconData icon,
    required String title,
    required String subtitle,
    required bool enabled,
  }) {
    final selected = _paymentMethod == method;
    return Opacity(
      opacity: enabled ? 1 : 0.5,
      child: GestureDetector(
        onTap: enabled ? () => setState(() => _paymentMethod = method) : null,
        child: CommonContainer(
          padding: const EdgeInsets.all(16),
          borderRadius: BorderRadius.circular(14),
          color: AppColors.clrWhiteFFFFFF,
          border: Border.all(color: selected ? AppColors.clr6156F1 : AppColors.grayEAECF0, width: selected ? 1.5 : 1),
          child: Row(
            children: [
              CommonIcon(icon: icon, size: 22, color: selected ? AppColors.clr6156F1 : AppColors.clrGrey757575),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    CommonText(data: title, style: TextStyles.bold.copyWith(fontSize: 14, color: AppColors.clr101828)),
                    const SizedBox(height: 2),
                    CommonText(data: subtitle, style: TextStyles.regular.copyWith(fontSize: 12, color: AppColors.clrGrey757575)),
                  ],
                ),
              ),
              CommonIcon(
                icon: selected ? Icons.radio_button_checked : Icons.radio_button_unchecked,
                color: selected ? AppColors.clr6156F1 : AppColors.clrGrey,
                size: 22,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPostpaidBanner() {
    return CommonContainer(
      padding: const EdgeInsets.all(16),
      borderRadius: BorderRadius.circular(14),
      color: const Color(0xFFE1F5FE),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const CommonIcon(icon: Icons.info_outline_rounded, color: AppColors.clr6156F1, size: 22),
          const SizedBox(width: 12),
          Expanded(
            child: CommonText(
              data:
                  "No payment needed now — the cost of each delivery is deducted from your wallet automatically as it's delivered.",
              style: TextStyles.medium.copyWith(fontSize: 13, color: AppColors.clr101828, height: 1.4),
            ),
          ),
        ],
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  const _Chip({required this.label, required this.selected, required this.onTap, this.compact = false});

  final String label;
  final bool selected;
  final bool compact;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: CommonContainer(
        padding: EdgeInsets.symmetric(horizontal: compact ? 14 : 18, vertical: compact ? 8 : 12),
        borderRadius: BorderRadius.circular(24),
        color: selected ? AppColors.clr101828 : AppColors.clrWhiteFFFFFF,
        border: selected ? null : Border.all(color: AppColors.grayEAECF0),
        child: CommonText(
          data: label,
          style: TextStyles.bold.copyWith(
            fontSize: compact ? 12 : 13,
            color: selected ? AppColors.clrWhiteFFFFFF : AppColors.clrGrey757575,
          ),
        ),
      ),
    );
  }
}
