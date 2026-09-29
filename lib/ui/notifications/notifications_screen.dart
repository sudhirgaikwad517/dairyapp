import 'package:dairy_app/framework/dependency_injection/inject.dart';
import 'package:dairy_app/framework/repository/notification/notification_repository.dart';
import 'package:dairy_app/ui/utils/theme/app_colors.dart';
import 'package:dairy_app/ui/utils/theme/text_styles.dart';
import 'package:dairy_app/ui/utils/widgets/common_container.dart';
import 'package:dairy_app/ui/utils/widgets/common_icon.dart';
import 'package:dairy_app/ui/utils/widgets/common_text.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/legacy.dart';
import 'package:intl/intl.dart';

final notificationsProvider =
    ChangeNotifierProvider.autoDispose((ref) => NotificationsController()..load());

class NotificationsController extends ChangeNotifier {
  List<AppNotificationModel> notifications = [];
  bool isLoading = false;
  String? error;

  NotificationRepository get _repository => getIt<NotificationRepository>();

  Future<void> load() async {
    isLoading = true;
    error = null;
    notifyListeners();

    final list = await _repository.getNotifications();
    if (list != null) {
      notifications = list;
    } else {
      error = 'Unable to load notifications';
    }

    isLoading = false;
    notifyListeners();
  }

  Future<void> markAllRead() async {
    await _repository.markAllRead();
    await load();
  }

  Future<void> markRead(AppNotificationModel notification) async {
    if (notification.isRead) return;
    await _repository.markRead(notification.id);
    await load();
  }
}

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final controller = ref.watch(notificationsProvider);
    final unread = controller.notifications.where((n) => !n.isRead).length;

    return Scaffold(
      backgroundColor: AppColors.clrF7F7F7,
      appBar: AppBar(
        backgroundColor: AppColors.clrWhiteFFFFFF,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, color: AppColors.clr101828, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
        title: CommonText(
          data: 'Notifications',
          style: TextStyles.bold.copyWith(fontSize: 18, color: AppColors.clr101828),
        ),
        actions: [
          if (unread > 0)
            TextButton(
              onPressed: () => ref.read(notificationsProvider).markAllRead(),
              child: Text('Mark all read', style: TextStyles.bold.copyWith(fontSize: 12, color: AppColors.clr6156F1)),
            ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.read(notificationsProvider).load(),
        child: controller.isLoading && controller.notifications.isEmpty
            ? const Center(child: CircularProgressIndicator())
            : controller.notifications.isEmpty
                ? ListView(
                    children: [
                      const SizedBox(height: 120),
                      Center(
                        child: Column(
                          children: [
                            const CommonIcon(icon: Icons.notifications_none_rounded, size: 70, color: AppColors.clr101828),
                            const SizedBox(height: 18),
                            CommonText(
                              data: controller.error ?? 'No notifications yet',
                              style: TextStyles.bold.copyWith(fontSize: 17, color: AppColors.clr101828),
                            ),
                            const SizedBox(height: 8),
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 40),
                              child: CommonText(
                                data: 'Offers and delivery updates from Shrishti Dairy Farm will appear here.',
                                textAlign: TextAlign.center,
                                style: TextStyles.regular.copyWith(fontSize: 13, color: AppColors.clrGrey757575),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: controller.notifications.length,
                    itemBuilder: (context, index) {
                      final notification = controller.notifications[index];
                      return GestureDetector(
                        onTap: () => ref.read(notificationsProvider).markRead(notification),
                        child: CommonContainer(
                          margin: const EdgeInsets.only(bottom: 12),
                          padding: const EdgeInsets.all(16),
                          borderRadius: BorderRadius.circular(14),
                          color: AppColors.clrWhiteFFFFFF,
                          border: notification.isRead
                              ? Border.all(color: AppColors.grayEAECF0)
                              : Border.all(color: AppColors.clr6156F1, width: 1.2),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Expanded(
                                    child: CommonText(
                                      data: notification.title,
                                      style: TextStyles.bold.copyWith(fontSize: 15, color: AppColors.clr101828),
                                    ),
                                  ),
                                  if (!notification.isRead)
                                    Container(
                                      height: 9,
                                      width: 9,
                                      decoration: const BoxDecoration(
                                        color: AppColors.clr6156F1,
                                        shape: BoxShape.circle,
                                      ),
                                    ),
                                ],
                              ),
                              const SizedBox(height: 6),
                              CommonText(
                                data: notification.message,
                                style: TextStyles.regular.copyWith(
                                  fontSize: 13,
                                  color: AppColors.clrGrey757575,
                                  height: 1.4,
                                ),
                              ),
                              if (notification.createdAt != null) ...[
                                const SizedBox(height: 8),
                                CommonText(
                                  data: DateFormat('dd MMM yyyy, hh:mm a').format(notification.createdAt!.toLocal()),
                                  style: TextStyles.regular.copyWith(fontSize: 11, color: AppColors.clrGrey),
                                ),
                              ],
                            ],
                          ),
                        ),
                      );
                    },
                  ),
      ),
    );
  }
}
