import 'package:dio/dio.dart';
import 'package:injectable/injectable.dart';

@lazySingleton
class DioClient {

  final Dio dio;

  DioClient(this.dio);

  final String _token = "eyJraWQiOiIyZDIwYTY1OS00ZGM5LTQwOGYtOWRlZS00ZTU0Yjk4NTc0OTEiLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJrb2R5LWNsaWVudCIsImF1ZCI6ImtvZHktY2xpZW50IiwibmJmIjoxNzc2ODU2MTA1LCJpc3MiOiJodHRwOi8vbG9jYWxob3N0OjkwMDAiLCJleHAiOjE3Nzk0NDgxMDUsImlhdCI6MTc3Njg1NjEwNSwidXNlciI6ImtvZHl0ZXN0LjIwMjBAZ21haWwuY29tfkVNQUlMISFVU0VSI0FQUCIsImp0aSI6IjA4Y2VkMjIwLTBiNmItNDBjMi1iZTgxLWIxMjlhNDhhMWQ3NCIsImF1dGhvcml0aWVzIjpbIlJPTEVfU1VQRVJfQURNSU4iXX0.isqpbSnmv37XaQzYQo1wT0nac1OtA5J72_M2N4w3FbpTpvB_4LUdItBEtKsw7ENXpFqOzqj4iWb8H-Ai5_ibPoPRh-_SUXbVNApIwDtTMraxt8_KOyRXFp98uq27nGEdCv0b1lA48K2U9rI9FBinESIWecR7oGgXM9gFAlTcYUpumQyTmL5HRL5vx9bLcVBMT9x4-gQ7rSsdqelZKkssLG4vnOYq8lvig5RBLUzcB7KP0vp5uxij1wVm_n5P59BQKtokg6hS2Y2cg1gUaRDDPQH1ptLJrjInz5y1BL3iTOiouFvBvCBrkerU2gS_bYMmADpszEAxayWYIt93EMCfAg";

   Future<Response> get(String path, {Map<String, dynamic>? queryParameters}) async{
     try{
       return await dio.get(
         path, 
         data: queryParameters,
         options: Options(
           headers: {
             'X-Auth-Token': _token,
             'Accept': 'application/json',
             'Content-Type': 'application/json',
           },
         ),
       );
     }catch(e){
       rethrow;
     }
   }

   Future<Response> post(String path, {dynamic data, Map<String, dynamic>? queryParameters}) async{
     try{
       return await dio.post(
         path, 
         data: queryParameters,
         options: Options(
           headers: {
             'X-Auth-Token': _token,
             'Accept': 'application/json',
             'Content-Type': 'application/json',
           },
         ),
       );
     }catch(e){
       rethrow;
     }
   }


}
