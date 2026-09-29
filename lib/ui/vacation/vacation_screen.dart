import 'package:dairy_app/framework/controller/vacation/vacation_controller.dart';
import 'package:dairy_app/framework/repository/vacation/vacation_model.dart';
import 'package:dairy_app/ui/utils/theme/app_colors.dart';
import 'package:dairy_app/ui/utils/theme/text_styles.dart';
import 'package:dairy_app/ui/utils/widgets/common_container.dart';
import 'package:dairy_app/ui/utils/widgets/common_icon.dart';
import 'package:dairy_app/ui/utils/widgets/common_text.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

/// "Vacation Mode" — pause every delivery across a date range (as opposed to
/// pausing one subscription, which lives on the Subscription tab).
class VacationScreen extends ConsumerStatefulWidget {
  const VacationScreen({super.key});

  @override
  ConsumerState<VacationScreen> createState() => _VacationScreenState();
}

class _VacationScreenState extends ConsumerState<VacationScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(vacationProvider).load());
  }

  @override
  Widget build(BuildContext context) {
    final controller = ref.watch(vacationProvider);

    return Scaffold(
      backgroundColor: AppColors.clrF7F7F7,
      body: SafeArea(
        child: Column(
          children: [
            _buildHeader(context),
            Expanded(
              child: RefreshIndicator(
                onRefresh: () => ref.read(vacationProvider).load(),
                child: SingleChildScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (controller.isLoading && controller.vacations.isEmpty)
                        const Padding(
                          padding: EdgeInsets.only(top: 60),
                          child: Center(child: CircularProgressIndicator()),
                        )
                      else ...[
                        _buildStatusCard(controller),
                        const SizedBox(height: 20),
                        _buildScheduleButton(controller),
                        if (controller.vacations.isNotEmpty) ...[
                          const SizedBox(height: 28),
                          CommonText(
                            data: "History",
                            style: TextStyles.bold.copyWith(fontSize: 16, color: AppColors.clr101828),
                          ),
                          const SizedBox(height: 12),
                          ...controller.vacations.map((v) => _buildVacationTile(controller, v)),
                        ],
                      ],
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
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
            data: "Vacation Mode",
            style: TextStyles.bold.copyWith(fontSize: 18, color: AppColors.clr101828),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusCard(VacationController controller) {
    final active = controller.active;
    final nextUpcoming = controller.upcoming.isNotEmpty ? controller.upcoming.first : null;

    String title;
    String message;
    IconData icon;
    Color color;

    if (active != null) {
      title = "You're on vacation";
      message = "Deliveries are paused until ${DateFormat('dd MMM yyyy').format(active.toDate)}.";
      icon = Icons.beach_access_rounded;
      color = AppColors.clr6156F1;
    } else if (nextUpcoming != null) {
      title = "Vacation scheduled";
      message =
          "Deliveries will pause from ${DateFormat('dd MMM yyyy').format(nextUpcoming.fromDate)} to ${DateFormat('dd MMM yyyy').format(nextUpcoming.toDate)}.";
      icon = Icons.event_available_rounded;
      color = AppColors.clrYellowF9A825;
    } else {
      title = "No vacation scheduled";
      message = "Going out of town? Schedule a vacation and we'll pause every delivery for those days.";
      icon = Icons.beach_access_outlined;
      color = AppColors.clrGrey757575;
    }

    return CommonContainer(
      padding: const EdgeInsets.all(18),
      borderRadius: BorderRadius.circular(16),
      color: AppColors.clrWhiteFFFFFF,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CommonContainer(
            height: 46,
            width: 46,
            borderRadius: BorderRadius.circular(23),
            color: color.withValues(alpha: 0.12),
            alignment: Alignment.center,
            child: CommonIcon(icon: icon, size: 24, color: color),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CommonText(data: title, style: TextStyles.bold.copyWith(fontSize: 15, color: AppColors.clr101828)),
                const SizedBox(height: 4),
                CommonText(
                  data: message,
                  style: TextStyles.regular.copyWith(fontSize: 13, color: AppColors.clrGrey757575, height: 1.4),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildScheduleButton(VacationController controller) {
    return GestureDetector(
      onTap: () => _openScheduleSheet(controller),
      child: CommonContainer(
        padding: const EdgeInsets.symmetric(vertical: 16),
        borderRadius: BorderRadius.circular(12),
        color: AppColors.clr101828,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const CommonIcon(icon: Icons.add_rounded, size: 20, color: AppColors.clrWhiteFFFFFF),
            const SizedBox(width: 8),
            CommonText(
              data: "Schedule Vacation",
              style: TextStyles.bold.copyWith(fontSize: 14, color: AppColors.clrWhiteFFFFFF),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildVacationTile(VacationController controller, VacationModel v) {
    final Color statusColor = v.isActive
        ? AppColors.clr6156F1
        : v.isUpcoming
            ? AppColors.clrYellowF9A825
            : AppColors.clrGrey757575;
    final String statusLabel = v.isActive ? 'Active' : v.isUpcoming ? 'Upcoming' : 'Completed';

    return CommonContainer(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      borderRadius: BorderRadius.circular(14),
      color: AppColors.clrWhiteFFFFFF,
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    CommonText(
                      data: '${DateFormat('dd MMM yyyy').format(v.fromDate)} — ${DateFormat('dd MMM yyyy').format(v.toDate)}',
                      style: TextStyles.bold.copyWith(fontSize: 14, color: AppColors.clr101828),
                    ),
                    const SizedBox(width: 8),
                    CommonContainer(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      borderRadius: BorderRadius.circular(20),
                      color: statusColor.withValues(alpha: 0.12),
                      child: CommonText(
                        data: statusLabel,
                        style: TextStyles.bold.copyWith(fontSize: 10, color: statusColor),
                      ),
                    ),
                  ],
                ),
                if (v.remark?.isNotEmpty == true) ...[
                  const SizedBox(height: 4),
                  CommonText(
                    data: v.remark!,
                    style: TextStyles.regular.copyWith(fontSize: 12, color: AppColors.clrGrey757575),
                  ),
                ],
              ],
            ),
          ),
          if (v.isActive || v.isUpcoming)
            TextButton(
              onPressed: controller.isSaving ? null : () => _confirmCancel(controller, v),
              child: Text(
                v.isUpcoming ? 'Cancel' : 'End Early',
                style: TextStyles.bold.copyWith(fontSize: 12, color: AppColors.clrRedD32F2F),
              ),
            ),
        ],
      ),
    );
  }

  Future<void> _confirmCancel(VacationController controller, VacationModel v) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text(v.isUpcoming ? 'Cancel this vacation?' : 'End vacation early?'),
        content: Text(
          v.isUpcoming
              ? 'Deliveries will resume as normal for these dates.'
              : "Deliveries will resume from tomorrow.",
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(dialogContext, false), child: const Text('Back')),
          TextButton(onPressed: () => Navigator.pop(dialogContext, true), child: const Text('Confirm')),
        ],
      ),
    );
    if (confirmed != true) return;

    final error = await controller.cancel(v.id);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(error ?? 'Updated'),
        backgroundColor: error == null ? AppColors.clr34C759 : AppColors.clrRedD32F2F,
      ),
    );
  }

  Future<void> _openScheduleSheet(VacationController controller) async {
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _ScheduleVacationSheet(controller: controller),
    );
  }
}

class _ScheduleVacationSheet extends StatefulWidget {
  const _ScheduleVacationSheet({required this.controller});

  final VacationController controller;

  @override
  State<_ScheduleVacationSheet> createState() => _ScheduleVacationSheetState();
}

class _ScheduleVacationSheetState extends State<_ScheduleVacationSheet> {
  late DateTime _from;
  late DateTime _to;
  final _remarkController = TextEditingController();
  String? _error;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _from = widget.controller.earliestStartDate;
    _to = _from;
  }

  @override
  void dispose() {
    _remarkController.dispose();
    super.dispose();
  }

  Future<void> _pickFrom() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _from,
      firstDate: widget.controller.earliestStartDate,
      lastDate: DateTime.now().add(const Duration(days: 180)),
    );
    if (picked == null) return;
    setState(() {
      _from = picked;
      if (_to.isBefore(_from)) _to = _from;
    });
  }

  Future<void> _pickTo() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _to,
      firstDate: _from,
      lastDate: DateTime.now().add(const Duration(days: 180)),
    );
    if (picked != null) setState(() => _to = picked);
  }

  Future<void> _submit() async {
    setState(() {
      _saving = true;
      _error = null;
    });

    final failure = await widget.controller.schedule(
      fromDate: _from,
      toDate: _to,
      remark: _remarkController.text,
    );

    if (!mounted) return;

    if (failure != null) {
      setState(() {
        _saving = false;
        _error = failure;
      });
      return;
    }

    Navigator.pop(context);
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Vacation scheduled'), backgroundColor: AppColors.clr34C759),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SafeArea(
        top: false,
        child: CommonContainer(
          color: AppColors.clrF7F7F7,
          borderRadius: const BorderRadius.only(topLeft: Radius.circular(24), topRight: Radius.circular(24)),
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CommonText(
                data: "Schedule Vacation",
                style: TextStyles.bold.copyWith(fontSize: 20, color: AppColors.clr101828),
              ),
              const SizedBox(height: 4),
              CommonText(
                data: "Earliest start date: ${DateFormat('dd MMM yyyy').format(widget.controller.earliestStartDate)}",
                style: TextStyles.regular.copyWith(fontSize: 12, color: AppColors.clrGrey757575),
              ),
              const SizedBox(height: 18),
              Row(
                children: [
                  Expanded(child: _dateField('From', _from, _pickFrom)),
                  const SizedBox(width: 12),
                  Expanded(child: _dateField('To', _to, _pickTo)),
                ],
              ),
              const SizedBox(height: 14),
              CommonContainer(
                padding: const EdgeInsets.symmetric(horizontal: 14),
                borderRadius: BorderRadius.circular(12),
                color: AppColors.clrWhiteFFFFFF,
                child: TextField(
                  controller: _remarkController,
                  decoration: InputDecoration(
                    border: InputBorder.none,
                    hintText: "Reason (optional)",
                    hintStyle: TextStyles.regular.copyWith(fontSize: 13, color: AppColors.clrGrey757575),
                  ),
                ),
              ),
              if (_error != null) ...[
                const SizedBox(height: 12),
                CommonText(
                  data: _error!,
                  style: TextStyles.medium.copyWith(fontSize: 12, color: AppColors.clrRedD32F2F),
                ),
              ],
              const SizedBox(height: 18),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _saving ? null : _submit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.clr101828,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: Text(
                    _saving ? 'Please wait...' : 'Confirm Vacation',
                    style: TextStyles.bold.copyWith(fontSize: 15, color: AppColors.clrWhiteFFFFFF),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _dateField(String label, DateTime value, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: CommonContainer(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        borderRadius: BorderRadius.circular(12),
        color: AppColors.clrWhiteFFFFFF,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            CommonText(data: label, style: TextStyles.regular.copyWith(fontSize: 11, color: AppColors.clrGrey757575)),
            const SizedBox(height: 2),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                CommonText(
                  data: DateFormat('dd/MM/yyyy').format(value),
                  style: TextStyles.bold.copyWith(fontSize: 14, color: AppColors.clr101828),
                ),
                const CommonIcon(icon: Icons.calendar_month_rounded, size: 16, color: AppColors.clr101828),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
