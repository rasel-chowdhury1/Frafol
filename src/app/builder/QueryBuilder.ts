

import mongoose, { FilterQuery, Query } from 'mongoose';

class QueryBuilder<T> {
  public modelQuery: Query<T[], T>;
  public query: Record<string, unknown>;

  constructor(modelQuery: Query<T[], T>, query: Record<string, unknown>) {
    this.modelQuery = modelQuery;
    this.query = query;
  }

  search(searchableFields: string[]) {
    const searchTerm = this?.query?.searchTerm;
    if (searchTerm) {
      this.modelQuery = this.modelQuery.find({
        $or: searchableFields.map(
          (field) =>
            ({
              [field]: { $regex: searchTerm, $options: 'i' },
            }) as FilterQuery<T>,
        ),
      });
    }
    return this;
  }

filter() {
  const queryObj = { ...this.query } as Record<string, any>;

  const excludeFields = ['searchTerm', 'sort', 'limit', 'page', 'fields'];
  excludeFields.forEach((el) => delete queryObj[el]);

  // ===== PRICE FILTER =====
  const minPrice = this.query.minPrice
    ? Number(this.query.minPrice)
    : undefined;

  const maxPrice = this.query.maxPrice
    ? Number(this.query.maxPrice)
    : undefined;

  if (minPrice !== undefined || maxPrice !== undefined) {
    queryObj.mainPrice = {};
    if (minPrice !== undefined) queryObj.mainPrice.$gte = minPrice;
    if (maxPrice !== undefined) queryObj.mainPrice.$lte = maxPrice;
  }

  delete queryObj.minPrice;
  delete queryObj.maxPrice;

  // ===== CATEGORY NAME FILTER =====
  if (this.query.categoryName) {
    queryObj['categoryId.title'] = {
      $regex: this.query.categoryName,
      $options: 'i',
    };
  }

  // ===== CATEGORY ID FILTER =====
  if (this.query.categoryId) {
    try {
      queryObj.categoryId = new mongoose.Types.ObjectId(
        this.query.categoryId as string,
      );
    } catch {
      console.warn('Invalid categoryId format, skipping filter');
    }
  }

  // ===== SUBSCRIPTION FILTER =====
  if (this.query.hasActiveSubscription === 'true') {
    queryObj.hasActiveSubscription = true;
  }

  // ===== CONDITION FILTER =====
  if (this.query.condition) {
    queryObj.condition = this.query.condition;
  }

  // ✅ SINGLE FIND CALL
  this.modelQuery = this.modelQuery.find(queryObj as FilterQuery<T>);

  return this;
}

  sort() {
    const sort =
      (this?.query?.sort as string)?.split(',')?.join(' ') || '-createdAt';
    this.modelQuery = this.modelQuery.sort(sort as string);
    return this;
  }

  paginate() {
    const page = Number(this?.query?.page) || 1;
    const limit = Number(this?.query?.limit) || 10;
    const skip = (page - 1) * limit;

    this.modelQuery = this.modelQuery.skip(skip).limit(limit);
    return this;
  }

  fields() {
    const fields =
      (this?.query?.fields as string)?.split(',')?.join(' ') || '-__v';

    this.modelQuery = this.modelQuery.select(fields);
    return this;
  }

  async countTotal() {
    const totalQuery = this.modelQuery.getFilter();
    const total = await this.modelQuery.model.countDocuments(totalQuery);
    const page = Number(this?.query?.page) || 1;
    const limit = Number(this?.query?.limit) || 10;
    const totalPage = Math.ceil(total / limit);

    return {
      page,
      limit,
      total,
      totalPage,
    };
  }
}

export default QueryBuilder;