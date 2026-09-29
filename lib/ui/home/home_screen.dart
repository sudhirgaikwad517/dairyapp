import 'package:dairy_app/framework/controller/address/address_controller.dart';
import 'package:dairy_app/ui/address/address_screen.dart';
import 'package:dairy_app/ui/best_sellers/best_sellers_screen.dart';
import 'package:dairy_app/ui/cart/add_to_cart_sheet.dart';
import 'package:dairy_app/ui/category/category_products_screen.dart';
import 'package:dairy_app/ui/menu/menu_screen.dart';
import 'package:dairy_app/ui/products/product_details_screen.dart';
import 'package:dairy_app/ui/utils/app_constants/app_constants.dart';
import 'package:dairy_app/ui/utils/theme/app_colors.dart';
import 'package:dairy_app/ui/utils/theme/text_styles.dart';
import 'package:dairy_app/ui/utils/widgets/common_button.dart';
import 'package:dairy_app/ui/utils/widgets/common_container.dart';
import 'package:dairy_app/ui/utils/widgets/common_icon.dart';
import 'package:dairy_app/ui/utils/widgets/common_text.dart';
import 'package:dairy_app/ui/wallet/wallet_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:carousel_slider/carousel_slider.dart';
import 'package:video_player/video_player.dart';
import 'package:dairy_app/framework/controller/wallet/wallet_controller.dart';
import 'package:dairy_app/framework/provider/banner/banner_provider.dart';
import 'package:dairy_app/framework/provider/catalog/catalog_provider.dart';
import 'package:dairy_app/framework/repository/cart/product_model.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenConsumerState();
}

class _HomeScreenConsumerState extends ConsumerState<HomeScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      ref.read(catalogNotifierProvider.notifier).fetchCatalog();
      ref.read(bannerNotifierProvider.notifier).fetchBanners();
      ref.read(walletProvider).loadWallet();
    });
  }

  @override
  Widget build(BuildContext context) {
    final watchAddress = ref.watch(addressProvider);
    final selectedAddress = watchAddress.selectedAddress;
    final catalogState = ref.watch(catalogNotifierProvider);

    return Scaffold(
      backgroundColor: AppColors.clrF7F7F7,
      body: SafeArea(
        child: Column(
          children: [
            /// Top Bar with Address (Static)
            _buildTopBar(selectedAddress?.address ?? "Select Address"),
            
            /// Scrollable Content
            Expanded(
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    /// First Banner (Carousel)
                    _buildBanner(),

                    const SizedBox(height: 24),

                    /// Categories
                    _buildSectionHeader(title : "Categories", navTitle: ''),
                    const SizedBox(height: 16),
                    _buildCategoriesList(),

                    const SizedBox(height: 24),

                    /// Best Sellers
                    _buildSectionHeader(
                      title: "Best Sellers",
                      navTitle: "View All",
                      filter: (p) => p.isPopular,
                    ),
                    const SizedBox(height: 16),
                    _buildHorizontalProductList(
                      catalogState.products.where((p) => p.isPopular).toList(),
                      catalogState.isLoading,
                    ),

                    const SizedBox(height: 24),

                    /// Second Banner (Video)
                    _buildDarkBanner(ref.watch(bannerNotifierProvider)),

                    const SizedBox(height: 24),

                    /// New Arrivals
                    _buildSectionHeader(
                      title: "New Arrivals",
                      navTitle: "View All",
                      filter: (p) => p.isNewArrival,
                    ),
                    const SizedBox(height: 16),
                    _buildHorizontalProductList(
                      catalogState.products.where((p) => p.isNewArrival).toList(),
                      catalogState.isLoading,
                    ),

                    const SizedBox(height: 24),

                    /// Seasonal Products
                    _buildSectionHeader(
                      title: "Seasonal Products",
                      navTitle: "View All",
                      filter: (p) => p.isSeasonal,
                    ),
                    const SizedBox(height: 16),
                    _buildHorizontalProductList(
                      catalogState.products.where((p) => p.isSeasonal).toList(),
                      catalogState.isLoading,
                    ),

                    const SizedBox(height: 32),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTopBar(String address) {
    return Padding(
      padding: const EdgeInsets.all(AppConstants.defaultPadding),
      child: Row(
        children: [
          /// Logo (Placeholder)
          CommonContainer(
            height: 40,
            width: 40,
            color: AppColors.clr6156F1,
            borderRadius: BorderRadius.circular(8),
            alignment: Alignment.center,
            child: const CommonIcon(
              icon: Icons.local_drink,
              color: AppColors.clrWhiteFFFFFF,
              size: 24,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: GestureDetector(
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => const AddressScreen(),
                  ),
                );
              },
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      CommonText(
                        data: "Deliver to",
                        style: TextStyles.bold.copyWith(
                          fontSize: 14,
                          color: AppColors.clr101828,
                        ),
                      ),
                      const CommonIcon(
                        icon: Icons.keyboard_arrow_down,
                        size: 18,
                      ),
                    ],
                  ),
                  CommonText(
                    data: address,
                    style: TextStyles.regular.copyWith(
                      fontSize: 12,
                      color: AppColors.clrGrey757575,
                    ),
                    maxLines: 1,
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(width: 12),

          /// Wallet/Balance
          GestureDetector(
            onTap: (){
              Navigator.push(context, MaterialPageRoute(builder: (context)=> WalletScreen()));
            },
            child: CommonContainer(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              borderRadius: BorderRadius.circular(20),
              color: AppColors.clr101828,
              child: Row(
                children: [
                  const CommonIcon(
                    icon: Icons.account_balance_wallet_outlined,
                    color: AppColors.clrWhiteFFFFFF,
                    size: 16,
                  ),
                  const SizedBox(width: 6),
                  CommonText(
                    data: "${AppConstants.currency}${ref.watch(walletProvider).balance.toStringAsFixed(0)}",
                    style: TextStyles.bold.copyWith(
                      color: AppColors.clrWhiteFFFFFF,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(width: 14),
          GestureDetector(
            onTap: (){
              Navigator.push(context, MaterialPageRoute(builder: (context)=> MenuScreen()));
            },
            child: CommonIcon(
              icon: Icons.menu,
              size: 28,
            ),
          )
        ],
      ),
    );
  }

  Widget _buildBanner() {
    final bannerState = ref.watch(bannerNotifierProvider);

    if (bannerState.isLoading) {
      return const Padding(
        padding: EdgeInsets.symmetric(horizontal: 16.0),
        child: SizedBox(
          height: 180,
          child: Center(child: CircularProgressIndicator()),
        ),
      );
    }

    // if (bannerState.error != null) {
    //   return const Padding(
    //     padding: EdgeInsets.symmetric(horizontal: 16.0),
    //     child: SizedBox(
    //       height: 180,
    //       child: Center(child: Text("Failed to load banners")),
    //     ),
    //   );
    // }

    final topBanners = bannerState.topBanners;

    if (topBanners.isEmpty) {
      return const Padding(
        padding: EdgeInsets.symmetric(horizontal: 16.0),
        child: SizedBox(
          height: 180,
          child: Center(child: Text("No banners found")),
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppConstants.defaultPadding),
      child: CarouselSlider(
        options: CarouselOptions(
          height: 180.0,
          autoPlay: true,
          enlargeCenterPage: false,
          viewportFraction: 1.0,
          aspectRatio: 16 / 9,
          autoPlayCurve: Curves.fastOutSlowIn,
          enableInfiniteScroll: true,
          autoPlayAnimationDuration: const Duration(milliseconds: 800),
        ),
        items: topBanners.map((banner) {
          return Builder(
            builder: (BuildContext context) {
              return Container(
                width: double.infinity,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(16),
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: Image.network(
                    banner,
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) => const ColoredBox(
                      color: AppColors.clrD7D7FF,
                      child: Icon(Icons.image, size: 50, color: AppColors.clr6156F1),
                    ),
                  ),
                ),
              );
            },
          );
        }).toList(),
      ),
    );
  }

  Widget _buildDarkBanner(BannerState bannerState) {
    final videoBanner = bannerState.secondBannerVideo;

    if (videoBanner.isEmpty) {
      return const SizedBox();
    }

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppConstants.defaultPadding),
      child: VideoBannerWidget(videoUrl: videoBanner),
    );
  }

  Widget _buildSectionHeader({
    required String title,
    required String navTitle,
    bool Function(ProductModel product)? filter,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: AppConstants.defaultPadding,
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          CommonText(
            data: title,
            style: TextStyles.bold.copyWith(
              fontSize: 18,
              color: AppColors.clr101828,
            ),
          ),
          if (navTitle.isNotEmpty)
            GestureDetector(
              onTap: () {
                // Each row opens its own list — every "View All" used to land
                // on Best Sellers regardless of which section was tapped.
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (context) => BestSellers(title: title, filter: filter),
                  ),
                );
              },
              child: CommonText(
                data: navTitle,
                style: TextStyles.bold.copyWith(
                  fontSize: 15,
                  color: AppColors.clr6156F1,
                ),
              ),
            )
        ],
      ),
    );
  }

  Widget _buildCategoriesList() {
    final catalogState = ref.watch(catalogNotifierProvider);
    final categories = catalogState.categories;

    if (catalogState.isLoading) {
      return const SizedBox(
        height: 140,
        child: Center(child: CircularProgressIndicator()),
      );
    }

    if (categories.isEmpty) {
      return const SizedBox(
        height: 140,
        child: Center(child: Text("No categories found.")),
      );
    }

    return SizedBox(
      height: 140,
      child: ListView.separated(
        padding: const EdgeInsets.symmetric(
          horizontal: AppConstants.defaultPadding,
        ),
        scrollDirection: Axis.horizontal,
        itemCount: categories.length,
        separatorBuilder: (context, index) => const SizedBox(width: 16),
        itemBuilder: (context, index) {
          final category = categories[index];
          return GestureDetector(
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => CategoryProductsScreen(
                  categoryId: category.id,
                  categoryLabel: category.label,
                ),
              ),
            ),
            child: Column(
            children: [
              CommonContainer(
                height: 100,
                width: 100,
                color: AppColors.clrWhiteFFFFFF,
                borderRadius: BorderRadius.circular(12),
                alignment: Alignment.center,
                child: (category.image == null || category.image!.isEmpty)
                    ? CommonIcon(
                        icon: category.label.toLowerCase() == 'milk'
                            ? Icons.water_drop
                            : category.label.toLowerCase() == 'ghee'
                            ? Icons.opacity
                            : Icons.layers,
                        color: AppColors.clr6156F1,
                        size: 40,
                      )
                    : ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: Image.network(
                          category.image!,
                          height: 100,
                          width: 100,
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) =>
                              const CommonIcon(
                                icon: Icons.layers,
                                color: AppColors.clr6156F1,
                                size: 40,
                              ),
                        ),
                      ),
              ),
              const SizedBox(height: 8),
              CommonText(
                data: category.label,
                style: TextStyles.medium.copyWith(
                  fontSize: 14,
                  color: AppColors.clr101828,
                ),
              ),
            ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildHorizontalProductList(List<ProductModel> products, bool isLoading) {
    if (isLoading) {
      return const SizedBox(
        height: 320,
        child: Center(child: CircularProgressIndicator()),
      );
    }

    if (products.isEmpty) {
      return const SizedBox(
        height: 320,
        child: Center(child: Text("No products available at the moment.")),
      );
    }

    return SizedBox(
      height: 320,
      child: ListView.separated(
        padding: const EdgeInsets.symmetric(
          horizontal: AppConstants.defaultPadding,
        ),
        scrollDirection: Axis.horizontal,
        itemCount: products.length,
        separatorBuilder: (context, index) => const SizedBox(width: 16),
        itemBuilder: (context, index) {
          final product = products[index];
          return GestureDetector(
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => ProductDetailsScreen(product: product),
              ),
            ),
            child: CommonContainer(
              width: 180,
              color: AppColors.clrWhiteFFFFFF,
              borderRadius: BorderRadius.circular(16),
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SizedBox(
                    height: 140,
                    width: double.infinity,
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: Image.network(
                        product.image ?? '',
                        fit: BoxFit.cover,
                        errorBuilder: (context, error, stackTrace) =>
                            const ColoredBox(
                              color: AppColors.clrD7D7FF,
                              child: Icon(
                                Icons.local_drink,
                                color: AppColors.clr6156F1,
                                size: 50,
                              ),
                            ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),

                  CommonText(
                    data: product.brand,
                    style: TextStyles.regular.copyWith(
                      fontSize: 12,
                      color: AppColors.clrGrey757575,
                    ),
                  ),
                  const SizedBox(height: 4),
                  CommonText(
                    data: product.name,
                    style: TextStyles.bold.copyWith(
                      fontSize: 14,
                      color: AppColors.clr101828,
                    ),
                    maxLines: 2,
                  ),
                  const SizedBox(height: 4),
                  CommonText(
                    data: product.volume,
                    style: TextStyles.regular.copyWith(
                      fontSize: 12,
                      color: AppColors.clrGrey757575,
                    ),
                  ),
                  const Spacer(),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          CommonText(
                            data:
                                "${AppConstants.currency}${product.price.toInt()}",
                            style: TextStyles.bold.copyWith(
                              fontSize: 16,
                              color: AppColors.clr101828,
                            ),
                          ),
                          // Only show a struck-through price when there is a
                          // real MRP behind it.
                          if (product.hasMrp)
                            CommonText(
                              data:
                                  "${AppConstants.currency}${product.mrp.toInt()}",
                              style: TextStyles.regular.copyWith(
                                fontSize: 12,
                                color: AppColors.clrGrey757575,
                                decoration: TextDecoration.lineThrough,
                              ),
                            ),
                        ],
                      ),
                      CommonButton(
                        onTap: () => showAddToCartSheet(context, product),
                        buttonText: "Add +",
                        buttonColor: AppColors.clr101828,
                        height: 32,
                        width: 65,
                        borderRadius: BorderRadius.circular(8),
                        buttonTextStyle: TextStyles.bold.copyWith(
                          color: AppColors.clrWhiteFFFFFF,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}


class VideoBannerWidget extends StatefulWidget {
  final String videoUrl;
  const VideoBannerWidget({super.key, required this.videoUrl});

  @override
  State<VideoBannerWidget> createState() => _VideoBannerWidgetState();
}

class _VideoBannerWidgetState extends State<VideoBannerWidget> {
  late VideoPlayerController _controller;
  bool _isInitialized = false;

  @override
  void initState() {
    super.initState();
    _controller = VideoPlayerController.networkUrl(Uri.parse(widget.videoUrl))
      ..initialize().then((_) {
        if (mounted) {
          setState(() {
            _isInitialized = true;
          });
          _controller.setLooping(true);
          _controller.setVolume(0); // Mute for banner
          _controller.play();
        }
      }).catchError((e) {
        print("Video Error: $e");
      });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 180,
      width: double.infinity,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        color: Colors.black,
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: _isInitialized
            ? FittedBox(
                fit: BoxFit.cover,
                child: SizedBox(
                  width: _controller.value.size.width,
                  height: _controller.value.size.height,
                  child: VideoPlayer(_controller),
                ),
              )
            : const Center(
                child: CircularProgressIndicator(color: Colors.white),
              ),
      ),
    );
  }
}
