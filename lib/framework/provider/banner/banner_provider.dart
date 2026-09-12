import 'package:dairy_app/framework/repository/banner/banner_repository.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class BannerState {
  final List<String> topBanners;
  final String secondBannerVideo;
  final bool isLoading;

  BannerState({
    required this.topBanners,
    required this.secondBannerVideo,
    required this.isLoading,
  });

  BannerState copyWith({
    List<String>? topBanners,
    String? secondBannerVideo,
    bool? isLoading,
  }) {
    return BannerState(
      topBanners: topBanners ?? this.topBanners,
      secondBannerVideo: secondBannerVideo ?? this.secondBannerVideo,
      isLoading: isLoading ?? this.isLoading,
    );
  }
}

class BannerNotifier extends Notifier<BannerState> {
  late final BannerRepository _repository;

  @override
  BannerState build() {
    _repository = BannerRepository();
    return BannerState(
      topBanners: [],
      secondBannerVideo: '',
      isLoading: true,
    );
  }

  Future<void> fetchBanners() async {
    state = state.copyWith(isLoading: true);
    final data = await _repository.fetchBanners();
    state = state.copyWith(
      topBanners: List<String>.from(data['topBanners'] ?? []),
      secondBannerVideo: data['secondBannerVideo'] ?? '',
      isLoading: false,
    );
  }
}

final bannerNotifierProvider =
    NotifierProvider<BannerNotifier, BannerState>(() {
  return BannerNotifier();
});
