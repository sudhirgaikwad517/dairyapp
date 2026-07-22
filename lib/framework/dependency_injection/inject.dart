import 'package:dairy_app/framework/dependency_injection/inject.config.dart';
import 'package:get_it/get_it.dart';
import 'package:injectable/injectable.dart';


final getIt = GetIt.instance;

@InjectableInit()
Future<void> configureDependencies() async{
   await getIt.init();
}

