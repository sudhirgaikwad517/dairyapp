import 'package:dairy_app/framework/dependency_injection/inject.dart';
import 'package:dairy_app/framework/repository/cutoff/cutoff_repository.dart';
import 'package:dairy_app/framework/repository/vacation/vacation_model.dart';
import 'package:dairy_app/framework/repository/vacation/vacation_repository.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/legacy.dart';

final vacationProvider = ChangeNotifierProvider((ref) => VacationController()..load());

class VacationController extends ChangeNotifier {
  VacationRepository get _repository => getIt<VacationRepository>();
  CutoffRepository get _cutoffRepository => getIt<CutoffRepository>();

  bool isLoading = false;
  bool isSaving = false;
  String? error;

  List<VacationModel> _vacations = [];
  VacationModel? _active;
  List<VacationModel> _upcoming = [];
  CutoffInfo _cutoff = CutoffInfo.fallback();

  List<VacationModel> get vacations => _vacations;
  VacationModel? get active => _active;
  List<VacationModel> get upcoming => _upcoming;

  /// Minimum selectable "from" date for a new vacation — never let the picker
  /// offer a date the cut-off time has already made unreachable.
  DateTime get earliestStartDate => _cutoff.earliestEffectiveDate;

  bool get onVacation => _active != null;

  Future<void> load() async {
    isLoading = true;
    error = null;
    notifyListeners();

    final results = await Future.wait([
      _repository.fetchVacations(),
      _cutoffRepository.fetchCutoffInfo(),
    ]);
    final list = results[0] as VacationListResult?;
    _cutoff = results[1] as CutoffInfo;

    if (list != null) {
      _vacations = list.vacations;
      _active = list.active;
      _upcoming = list.upcoming;
    } else {
      error = 'Unable to load your vacation status';
    }

    isLoading = false;
    notifyListeners();
  }

  /// Returns null on success, or the error message.
  Future<String?> schedule({
    required DateTime fromDate,
    required DateTime toDate,
    String? remark,
  }) async {
    isSaving = true;
    notifyListeners();

    final failure = await _repository.create(fromDate: fromDate, toDate: toDate, remark: remark);
    if (failure == null) {
      await load();
    }

    isSaving = false;
    notifyListeners();
    return failure?.message;
  }

  /// Returns null on success, or the error message.
  Future<String?> cancel(String id) async {
    isSaving = true;
    notifyListeners();

    final failure = await _repository.cancel(id);
    if (failure == null) {
      await load();
    }

    isSaving = false;
    notifyListeners();
    return failure;
  }
}
